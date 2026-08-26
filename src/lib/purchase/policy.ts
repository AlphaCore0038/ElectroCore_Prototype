import type { CatalogProduct } from "@/lib/catalog/types";

export const MAX_TOTAL_PAISE = 5_000_000; // ₹50,000
export const ALLOWED_CURRENCY = "INR";
export const ALLOWED_QUANTITY = 1;

export type PolicyOk = { allowed: true };
export type PolicyFail = { allowed: false; reason: string };
export type PolicyResult = PolicyOk | PolicyFail;

export function evaluatePolicy(
  product: Pick<CatalogProduct, "price" | "currency" | "stock" | "status">,
  quantity: number,
  total: number
): PolicyResult {
  if (quantity !== ALLOWED_QUANTITY) {
    return { allowed: false, reason: "INVALID_QUANTITY" };
  }
  if (product.status !== "ACTIVE") {
    return { allowed: false, reason: "NOT_ACTIVE" };
  }
  if (product.stock < quantity) {
    return { allowed: false, reason: "OUT_OF_STOCK" };
  }
  if (product.currency !== ALLOWED_CURRENCY) {
    return { allowed: false, reason: "CURRENCY_MISMATCH" };
  }
  if (total > MAX_TOTAL_PAISE) {
    return { allowed: false, reason: "AMOUNT_LIMIT_EXCEEDED" };
  }
  if (total !== product.price * quantity) {
    return { allowed: false, reason: "AMOUNT_MISMATCH" };
  }
  return { allowed: true };
}
