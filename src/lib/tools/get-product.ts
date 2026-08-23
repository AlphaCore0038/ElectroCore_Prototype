import { getProductByIdOrSlug } from "@/lib/catalog/queries";
import type { ToolResult } from "./types";

export type GetProductInput = {
  product: string;
};

type GetProductData = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  attributes: unknown;
  available: boolean;
  stock: number;
};

export async function getProduct(input: GetProductInput): Promise<ToolResult<GetProductData>> {
  const raw = typeof input.product === "string" ? input.product.trim() : "";
  if (!raw) {
    return { ok: false, error: "INVALID_INPUT", message: "product is required" };
  }

  try {
    const product = await getProductByIdOrSlug(raw);
    if (!product) {
      return { ok: false, error: "NOT_FOUND", message: "Product not found" };
    }

    const available = product.stock > 0 && product.status === "ACTIVE";

    return {
      ok: true,
      data: {
        id: product.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
        price: product.price,
        currency: product.currency,
        category: product.category,
        attributes: product.attributes,
        available,
        stock: product.stock,
      },
    };
  } catch (error) {
    console.error("get_product failed", error);
    return { ok: false, error: "INTERNAL_ERROR", message: "Failed to fetch product" };
  }
}
