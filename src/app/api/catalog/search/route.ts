import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/catalog/queries";
import type { ProductCategory } from "@/lib/catalog/types";

const ALLOWED_CATEGORIES: ProductCategory[] = [
  "AUDIO",
  "PERIPHERALS",
  "POWER",
  "CABLES",
  "STORAGE",
  "ACCESSORIES",
];

function parseInStock(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return undefined;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const qRaw = searchParams.get("q");
    const categoryRaw = searchParams.get("category");
    const inStockRaw = searchParams.get("inStock");
    const limitRaw = searchParams.get("limit");
    const cursorRaw = searchParams.get("cursor");

    const q = qRaw?.trim() || undefined;

    if (q !== undefined && q.length > 100) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "q must be at most 100 characters" },
        { status: 400 }
      );
    }

    let category: ProductCategory | undefined;
    if (categoryRaw !== null) {
      if (!ALLOWED_CATEGORIES.includes(categoryRaw as ProductCategory)) {
        return NextResponse.json(
          {
            error: "BAD_REQUEST",
            message: `category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`,
          },
          { status: 400 }
        );
      }
      category = categoryRaw as ProductCategory;
    }

    const inStock = parseInStock(inStockRaw);
    if (inStockRaw !== null && inStock === undefined) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "inStock must be true or false" },
        { status: 400 }
      );
    }

    let limit: number | undefined;
    if (limitRaw !== null) {
      const n = Number(limitRaw);
      if (!Number.isInteger(n) || n < 1 || n > 50) {
        return NextResponse.json(
          { error: "BAD_REQUEST", message: "limit must be an integer between 1 and 50" },
          { status: 400 }
        );
      }
      limit = n;
    }

    const cursor = cursorRaw?.trim() || undefined;
    if (cursor !== undefined && !/^c[a-z0-9]{20,}$/.test(cursor)) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "cursor is invalid" },
        { status: 400 }
      );
    }

    const result = await searchProducts({ q, category, inStock, limit, cursor });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET /api/catalog/search failed", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to search products" },
      { status: 500 }
    );
  }
}
