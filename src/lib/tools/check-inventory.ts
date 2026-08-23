import { getAvailability } from "@/lib/catalog/queries";
import type { ToolResult } from "./types";

export type CheckInventoryInput = {
  product: string;
};

type CheckInventoryData = {
  id: string;
  slug: string;
  available: boolean;
  stock: number;
  price: number;
  currency: string;
};

export async function checkInventory(
  input: CheckInventoryInput
): Promise<ToolResult<CheckInventoryData>> {
  const raw = typeof input.product === "string" ? input.product.trim() : "";
  if (!raw) {
    return { ok: false, error: "INVALID_INPUT", message: "product is required" };
  }

  try {
    const availability = await getAvailability(raw);
    if (!availability) {
      return { ok: false, error: "NOT_FOUND", message: "Product not found" };
    }

    return {
      ok: true,
      data: {
        id: availability.id,
        slug: availability.slug,
        available: availability.available,
        stock: availability.stock,
        price: availability.price,
        currency: availability.currency,
      },
    };
  } catch (error) {
    console.error("check_inventory failed", error);
    return { ok: false, error: "INTERNAL_ERROR", message: "Failed to check inventory" };
  }
}
