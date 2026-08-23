import { NextResponse } from "next/server";
import { getProductByIdOrSlug } from "@/lib/catalog/queries";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Product id is required" },
        { status: 400 }
      );
    }

    const product = await getProductByIdOrSlug(id.trim());

    if (!product) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(product, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET /api/catalog/products/:id failed", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
