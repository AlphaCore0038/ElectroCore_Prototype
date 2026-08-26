import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { evaluatePolicy } from "@/lib/purchase/policy";
import { auditLog } from "@/lib/audit/log";
import { createRazorpayOrder, getRazorpayConfig } from "@/lib/razorpay/client";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Invalid JSON" }, { status: 400 });
  }

  const b = body as { intentId?: unknown };
  const intentId = typeof b.intentId === "string" ? b.intentId.trim() : "";
  if (!intentId) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "intentId is required" }, { status: 400 });
  }

  const intent = await prisma.purchaseIntent.findUnique({
    where: { id: intentId },
    include: { product: true },
  });

  if (!intent) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND", message: "Intent not found" }, { status: 404 });
  }

  if (intent.status !== "PENDING") {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", message: `Intent is ${intent.status}` },
      { status: 400 }
    );
  }

  if (intent.expiresAt.getTime() < Date.now()) {
    await prisma.purchaseIntent.update({ where: { id: intent.id }, data: { status: "EXPIRED" } });
    await auditLog({ type: "POLICY_REJECTED", intentId: intent.id, reason: "EXPIRED", metadata: { intentId } });
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Intent expired" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: intent.productId } });
  if (!product) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND", message: "Product not found" }, { status: 404 });
  }

  const currentTotal = product.price * intent.quantity;
  if (currentTotal !== intent.total || product.price !== intent.unitPrice) {
    await auditLog({
      type: "POLICY_REJECTED",
      intentId: intent.id,
      reason: "PRICE_CHANGED",
      metadata: { intentTotal: intent.total, currentTotal, intentUnitPrice: intent.unitPrice, currentPrice: product.price },
    });
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", message: "Price changed, please prepare again" },
      { status: 400 }
    );
  }

  const policy = evaluatePolicy(
    { price: product.price, currency: product.currency, stock: product.stock, status: product.status as never },
    intent.quantity,
    currentTotal
  );
  if (!policy.allowed) {
    await auditLog({ type: "POLICY_REJECTED", intentId: intent.id, reason: policy.reason, metadata: { productId: product.id } });
    return NextResponse.json({ ok: false, error: "POLICY_REJECTED", message: policy.reason, reason: policy.reason }, { status: 400 });
  }

  const existing = await prisma.payment.findUnique({ where: { intentId: intent.id } });
  if (existing) {
    const cfg = getRazorpayConfig();
    return NextResponse.json({
      ok: true,
      data: {
        razorpayOrderId: existing.razorpayOrderId,
        keyId: cfg?.keyId ?? null,
        amount: existing.amount,
        currency: existing.currency,
        intentId: intent.id,
        paymentId: existing.id,
      },
    });
  }

  const cfg = getRazorpayConfig();
  if (!cfg) {
    return NextResponse.json(
      { ok: false, error: "CONFIG_ERROR", message: "Payment not configured" },
      { status: 500 }
    );
  }

  let razorpayOrderId: string;
  try {
    const order = await createRazorpayOrder({
      amount: intent.total,
      currency: intent.currency,
      receipt: intent.id,
      notes: { productId: product.id, slug: product.slug },
    });
    razorpayOrderId = order.id;
  } catch (e) {
    console.error("[payment/create] razorpay failed", e);
    return NextResponse.json({ ok: false, error: "PAYMENT_ERROR", message: "Failed to create payment order" }, { status: 502 });
  }

  const payment = await prisma.payment.create({
    data: {
      intentId: intent.id,
      razorpayOrderId,
      amount: intent.total,
      currency: intent.currency,
      status: "CREATED",
    },
  });

  await auditLog({
    type: "PAYMENT_ORDER_CREATED",
    intentId: intent.id,
    paymentId: payment.id,
    metadata: { razorpayOrderId, amount: intent.total, currency: intent.currency },
  });

  return NextResponse.json({
    ok: true,
    data: {
      razorpayOrderId,
      keyId: cfg.keyId,
      amount: intent.total,
      currency: intent.currency,
      intentId: intent.id,
      paymentId: payment.id,
    },
  });
}
