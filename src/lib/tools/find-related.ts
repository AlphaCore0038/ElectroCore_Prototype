import { prisma } from "@/lib/db";
import { getProductByIdOrSlug } from "@/lib/catalog/queries";
import type { ProductCategory } from "@/lib/catalog/types";
import type { ToolResult } from "./types";

export type FindRelatedInput = {
  product: string;
  limit?: number;
};

type RelatedSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: ProductCategory;
  attributes: unknown;
};

type FindRelatedData = {
  products: RelatedSummary[];
};

function getCompatibleWith(attrs: unknown): string[] {
  if (!attrs || typeof attrs !== "object") return [];
  const c = (attrs as { compatibleWith?: unknown }).compatibleWith;
  if (!Array.isArray(c)) return [];
  return c.filter((x): x is string => typeof x === "string");
}

export async function findRelatedProducts(input: FindRelatedInput): Promise<ToolResult<FindRelatedData>> {
  const raw = typeof input.product === "string" ? input.product.trim() : "";
  if (!raw) {
    return { ok: false, error: "INVALID_INPUT", message: "product is required" };
  }

  let limit = 2;
  if (input.limit !== undefined) {
    if (typeof input.limit !== "number" || !Number.isInteger(input.limit) || input.limit < 1 || input.limit > 5) {
      return { ok: false, error: "INVALID_INPUT", message: "limit must be an integer between 1 and 5" };
    }
    limit = input.limit;
  }

  const source = await getProductByIdOrSlug(raw);
  if (!source) {
    return { ok: false, error: "NOT_FOUND", message: "Product not found" };
  }

  const candidates = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      stock: { gt: 0 },
      id: { not: source.id },
    },
    orderBy: { name: "asc" },
  });

  const sourceCompat = getCompatibleWith(source.attributes);

  const scored = candidates.map((p) => {
    const candCompat = getCompatibleWith(p.attributes);
    const isCompat =
      candCompat.includes(source.slug) ||
      candCompat.includes(source.id) ||
      sourceCompat.includes(p.slug) ||
      sourceCompat.includes(p.id);
    const sameCategory = p.category === source.category;
    const score = (isCompat ? 2 : 0) + (sameCategory ? 1 : 0);
    return { p, score, isCompat, sameCategory };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.isCompat !== b.isCompat) return a.isCompat ? -1 : 1;
    return a.p.name.localeCompare(b.p.name);
  });

  const top = scored.slice(0, limit).map(({ p }) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    price: p.price,
    currency: p.currency,
    category: p.category as ProductCategory,
    attributes: p.attributes,
  }));

  return { ok: true, data: { products: top } };
}
