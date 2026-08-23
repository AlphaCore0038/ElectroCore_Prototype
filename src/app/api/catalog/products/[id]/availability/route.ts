import { NextResponse } from "next/server";
import { getAvailability } from "@/lib/catalog/queries";

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

    const availability = await getAvailability(id.trim());

    if (!availability) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(availability, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET /api/catalog/products/:id/availability failed", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}
