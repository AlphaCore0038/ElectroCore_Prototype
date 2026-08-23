import { searchProducts as catalogSearch } from "@/lib/catalog/queries";
import type { ProductCategory } from "@/lib/catalog/types";
import type { ToolResult } from "./types";

const ALLOWED_CATEGORIES: ProductCategory[] = [
  "AUDIO",
  "PERIPHERALS",
  "POWER",
  "CABLES",
  "STORAGE",
  "ACCESSORIES",
];

export type SearchProductsInput = {
  query?: string;
  category?: string;
  in_stock?: boolean;
  max_price?: number;
  limit?: number;
};

type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: ProductCategory;
  attributes: unknown;
};

type SearchProductsData = {
  products: ProductSummary[];
};

export async function searchProducts(
  input: SearchProductsInput
): Promise<ToolResult<SearchProductsData>> {
  const query = typeof input.query === "string" ? input.query.trim() : undefined;
  if (query !== undefined && query.length > 100) {
    return { ok: false, error: "INVALID_INPUT", message: "query must be at most 100 characters" };
  }

  let category: ProductCategory | undefined;
  if (input.category !== undefined) {
    if (typeof input.category !== "string" || !ALLOWED_CATEGORIES.includes(input.category as ProductCategory)) {
      return {
        ok: false,
        error: "INVALID_INPUT",
        message: `category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`,
      };
    }
    category = input.category as ProductCategory;
  }

  let inStock: boolean | undefined;
  if (input.in_stock !== undefined) {
    if (typeof input.in_stock !== "boolean") {
      return { ok: false, error: "INVALID_INPUT", message: "in_stock must be a boolean" };
    }
    inStock = input.in_stock;
  }

  let maxPrice: number | undefined;
  if (input.max_price !== undefined) {
    if (typeof input.max_price !== "number" || !Number.isInteger(input.max_price) || input.max_price < 0) {
      return { ok: false, error: "INVALID_INPUT", message: "max_price must be an integer >= 0" };
    }
    maxPrice = input.max_price;
  }

  let limit = 10;
  if (input.limit !== undefined) {
    if (typeof input.limit !== "number" || !Number.isInteger(input.limit) || input.limit < 1 || input.limit > 20) {
      return { ok: false, error: "INVALID_INPUT", message: "limit must be an integer between 1 and 20" };
    }
    limit = input.limit;
  }

  try {
    const result = await catalogSearch({
      q: query || undefined,
      category,
      inStock: inStock || undefined,
      maxPrice,
      limit,
    });

    const products: ProductSummary[] = result.products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      price: p.price,
      currency: p.currency,
      category: p.category,
      attributes: p.attributes,
    }));

    return { ok: true, data: { products } };
  } catch (error) {
    console.error("search_products failed", error);
    return { ok: false, error: "INTERNAL_ERROR", message: "Failed to search products" };
  }
}
