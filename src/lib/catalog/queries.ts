import { prisma } from "@/lib/db";
import type {
  Availability,
  CatalogProduct,
  ProductCategory,
  SearchParams,
  SearchResult,
} from "./types";

function toCatalogProduct(p: {
  id: string;
  merchantId: string;
  slug: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  stock: number;
  status: string;
  imageUrl: string | null;
  attributes: unknown;
  createdAt: Date;
  updatedAt: Date;
}): CatalogProduct {
  return {
    id: p.id,
    merchantId: p.merchantId,
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    description: p.description,
    category: p.category as ProductCategory,
    price: p.price,
    currency: p.currency,
    stock: p.stock,
    status: p.status as CatalogProduct["status"],
    imageUrl: p.imageUrl,
    attributes: p.attributes as CatalogProduct["attributes"],
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function searchProducts(params: SearchParams): Promise<SearchResult> {
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);
  const q = params.q?.trim();
  const category = params.category;
  const inStock = params.inStock;
  const cursor = params.cursor;
  const maxPrice = params.maxPrice;

  const where: Record<string, unknown> = {
    status: "ACTIVE",
  };

  if (q) {
    // PostgreSQL case-insensitive
    where["OR"] = [
      { name: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
    ];
  }

  if (category) {
    where["category"] = category;
  }

  if (inStock) {
    where["stock"] = { gt: 0 };
  }

  if (maxPrice !== undefined) {
    where["price"] = { lte: maxPrice };
  }

  const products = await prisma.product.findMany({
    where: where as never,
    take: limit + 1,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });

  let nextCursor: string | null = null;
  let result = products;
  if (products.length > limit) {
    result = products.slice(0, limit);
    nextCursor = result[result.length - 1].id;
  }

  return {
    products: result.map(toCatalogProduct),
    nextCursor,
  };
}

export async function getProductByIdOrSlug(idOrSlug: string): Promise<CatalogProduct | null> {
  const product = await prisma.product.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
  });

  if (!product) return null;
  return toCatalogProduct(product);
}

export async function getAvailability(idOrSlug: string): Promise<Availability | null> {
  const product = await prisma.product.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    select: {
      id: true,
      slug: true,
      stock: true,
      status: true,
      price: true,
      currency: true,
    },
  });

  if (!product) return null;

  return {
    id: product.id,
    slug: product.slug,
    stock: product.stock,
    status: product.status as Availability["status"],
    price: product.price,
    currency: product.currency,
    available: product.stock > 0 && product.status === "ACTIVE",
  };
}
