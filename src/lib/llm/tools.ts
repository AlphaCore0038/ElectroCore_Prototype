import { searchProducts } from "@/lib/tools/search-products";
import { getProduct } from "@/lib/tools/get-product";
import { checkInventory } from "@/lib/tools/check-inventory";
import { findRelatedProducts } from "@/lib/tools/find-related";
import type { ToolDefinition } from "./types";

export const toolDefinitions: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Search ElectroCore catalog. Returns matching products with id, slug, name, description, price, currency, category, attributes. Price in paise (e.g. 300000 = ₹3,000).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search terms, e.g. 'wireless headphones'" },
          category: {
            type: "string",
            enum: ["AUDIO", "PERIPHERALS", "POWER", "CABLES", "STORAGE", "ACCESSORIES"],
            description: "Filter by category",
          },
          in_stock: { type: "boolean", description: "Only in-stock products" },
          max_price: { type: "integer", description: "Max price in paise (e.g. 300000 = ₹3,000)" },
          limit: { type: "integer", description: "Max results 1-20, default 10" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product",
      description: "Get full details for a specific product by id or slug. Includes price, availability and attributes.",
      parameters: {
        type: "object",
        properties: {
          product: { type: "string", description: "Product id or slug" },
        },
        required: ["product"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_inventory",
      description: "Check stock and availability for a product by id or slug.",
      parameters: {
        type: "object",
        properties: {
          product: { type: "string", description: "Product id or slug" },
        },
        required: ["product"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_related_products",
      description: "Find ACTIVE in-stock products related to a given product via compatibleWith and same category. Use to suggest complements or cross-sell.",
      parameters: {
        type: "object",
        properties: {
          product: { type: "string", description: "Source product id or slug" },
          limit: { type: "integer", description: "Max results 1-5, default 2" },
        },
        required: ["product"],
      },
    },
  },
];

export async function executeTool(name: string, argsJson: string): Promise<string> {
  let args: Record<string, unknown>;
  try {
    args = argsJson ? (JSON.parse(argsJson) as Record<string, unknown>) : {};
  } catch {
    return JSON.stringify({ ok: false, error: "INVALID_INPUT", message: "Invalid tool arguments JSON" });
  }

  switch (name) {
    case "search_products":
      return JSON.stringify(
        await searchProducts(args as { query?: string; category?: string; in_stock?: boolean; max_price?: number; limit?: number })
      );
    case "get_product":
      return JSON.stringify(await getProduct(args as { product: string }));
    case "check_inventory":
      return JSON.stringify(await checkInventory(args as { product: string }));
    case "find_related_products":
      return JSON.stringify(await findRelatedProducts(args as { product: string; limit?: number }));
    default:
      return JSON.stringify({ ok: false, error: "UNKNOWN_TOOL", message: `Unknown tool: ${name}` });
  }
}
