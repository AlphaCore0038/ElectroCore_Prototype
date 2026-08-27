import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getProductByIdOrSlug } from "@/lib/catalog/queries";
import { evaluatePolicy } from "@/lib/purchase/policy";
import { auditLog } from "@/lib/audit/log";
import { appendEvent } from "@/lib/event-store";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Invalid JSON" }, { status: 400 });
  }

  const b = body as { product?: unknown; quantity?: unknown };

  const rawProduct = typeof b.product === "string" ? b.product.trim() : "";
  if (!rawProduct) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "product is required" }, { status: 400 });
  }

  let quantity = 1;
  if (b.quantity !== undefined) {
    if (typeof b.quantity !== "number" || !Number.isInteger(b.quantity) || b.quantity !== 1) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", message: "quantity must be 1" },
        { status: 400 }
      );
    }
    quantity = b.quantity;
  }

  const product = await getProductByIdOrSlug(rawProduct);
  if (!product) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND", message: "Product not found" }, { status: 404 });
  }

  const unitPrice = product.price;
  const total = unitPrice * quantity;
  const currency = product.currency;

  const policy = evaluatePolicy(product, quantity, total);
  if (!policy.allowed) {
    await auditLog({
      type: "POLICY_REJECTED",
      reason: policy.reason,
      metadata: { productId: product.id, slug: product.slug, quantity, total, currency },
    });
    return NextResponse.json(
      { ok: false, error: "POLICY_REJECTED", message: policy.reason, reason: policy.reason },
      { status: 400 }
    );
  }

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const intent = await prisma.purchaseIntent.create({
    data: {
      productId: product.id,
      quantity,
      unitPrice,
      total,
      currency,
      status: "PENDING",
      expiresAt,
    },
  });

  await auditLog({
    type: "INTENT_CREATED",
    intentId: intent.id,
    metadata: { productId: product.id, slug: product.slug, quantity, unitPrice, total, currency },
  });

  appendEvent({ type: "PURCHASE_INTENT", intentId: intent.id, product: product.slug, total, currency });

  return NextResponse.json({
    ok: true,
    data: {
      intentId: intent.id,
      product: { id: product.id, slug: product.slug, name: product.name, sku: product.sku },
      quantity,
      unitPrice,
      total,
      currency,
      expiresAt: intent.expiresAt.toISOString(),
    },
  });
}
