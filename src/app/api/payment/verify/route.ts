import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRazorpayConfig, verifySignature } from "@/lib/razorpay/client";
import { auditLog } from "@/lib/audit/log";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Invalid JSON" }, { status: 400 });
  }

  const b = body as {
    intentId?: unknown;
    razorpay_payment_id?: unknown;
    razorpay_order_id?: unknown;
    razorpay_signature?: unknown;
  };

  const intentId = typeof b.intentId === "string" ? b.intentId.trim() : "";
  const razorpayPaymentId = typeof b.razorpay_payment_id === "string" ? b.razorpay_payment_id.trim() : "";
  const razorpayOrderId = typeof b.razorpay_order_id === "string" ? b.razorpay_order_id.trim() : "";
  const razorpaySignature = typeof b.razorpay_signature === "string" ? b.razorpay_signature.trim() : "";

  if (!intentId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", message: "intentId, razorpay_payment_id, razorpay_order_id, razorpay_signature are required" },
      { status: 400 }
    );
  }

  const intent = await prisma.purchaseIntent.findUnique({ where: { id: intentId } });
  if (!intent) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND", message: "Intent not found" }, { status: 404 });
  }

  if (intent.status !== "PENDING") {
    // idempotency: if already consumed, try to return existing order
    if (intent.status === "CONSUMED") {
      const existingOrder = await prisma.order.findUnique({ where: { intentId } });
      if (existingOrder) {
        return NextResponse.json({ ok: true, data: { orderId: existingOrder.id, status: existingOrder.status } });
      }
    }
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: `Intent is ${intent.status}` }, { status: 400 });
  }

  if (intent.expiresAt.getTime() < Date.now()) {
    await prisma.purchaseIntent.update({ where: { id: intent.id }, data: { status: "EXPIRED" } });
    await auditLog({ type: "PAYMENT_FAILED", intentId: intent.id, reason: "EXPIRED" });
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Intent expired" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({ where: { intentId } });
  if (!payment) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Payment not created" }, { status: 400 });
  }

  if (payment.status === "VERIFIED") {
    const existingOrder = await prisma.order.findUnique({ where: { intentId } });
    if (existingOrder) {
      return NextResponse.json({ ok: true, data: { orderId: existingOrder.id, status: existingOrder.status } });
    }
  }

  if (payment.status === "FAILED") {
    return NextResponse.json({ ok: false, error: "PAYMENT_FAILED", message: "Payment already failed" }, { status: 400 });
  }

  if (payment.razorpayOrderId !== razorpayOrderId) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    await auditLog({ type: "PAYMENT_FAILED", intentId, paymentId: payment.id, reason: "ORDER_ID_MISMATCH", metadata: { razorpayOrderId, expected: payment.razorpayOrderId } });
    return NextResponse.json({ ok: false, error: "PAYMENT_FAILED", message: "Order ID mismatch" }, { status: 400 });
  }

  // replay protection: paymentId unique
  const existingByPayment = await prisma.payment.findFirst({ where: { razorpayPaymentId } });
  if (existingByPayment && existingByPayment.id !== payment.id) {
    await auditLog({ type: "PAYMENT_FAILED", intentId, paymentId: payment.id, reason: "PAYMENT_ID_REUSE" });
    return NextResponse.json({ ok: false, error: "PAYMENT_FAILED", message: "Payment already used" }, { status: 400 });
  }

  const cfg = getRazorpayConfig();
  if (!cfg) {
    return NextResponse.json({ ok: false, error: "CONFIG_ERROR", message: "Payment not configured" }, { status: 500 });
  }

  const okSig = verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature, cfg.keySecret);
  if (!okSig) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", razorpayPaymentId, razorpaySignature },
    });
    await auditLog({ type: "PAYMENT_FAILED", intentId, paymentId: payment.id, reason: "SIGNATURE_MISMATCH", metadata: { razorpayOrderId } });
    return NextResponse.json({ ok: false, error: "PAYMENT_FAILED", message: "Payment verification failed. No order created." }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: intent.productId } });
  if (!product) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND", message: "Product not found" }, { status: 404 });
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.updateMany({
        where: {
          id: product.id,
          stock: { gte: intent.quantity },
        },
        data: {
          stock: { decrement: intent.quantity },
        },
      });

      if (updated.count === 0) {
        throw new Error("OUT_OF_STOCK");
      }

      const createdOrder = await tx.order.create({
        data: {
          intentId: intent.id,
          merchantId: product.merchantId,
          total: intent.total,
          currency: intent.currency,
          status: "PAID",
          items: {
            create: {
              productId: product.id,
              slug: product.slug,
              name: product.name,
              sku: product.sku,
              unitPrice: intent.unitPrice,
              quantity: intent.quantity,
              total: intent.total,
            },
          },
        },
      });

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          orderId: createdOrder.id,
          razorpayPaymentId,
          razorpaySignature,
          status: "VERIFIED",
          verifiedAt: new Date(),
        },
      });

      await tx.purchaseIntent.update({
        where: { id: intent.id },
        data: { status: "CONSUMED" },
      });

      await tx.auditEvent.create({
        data: {
          type: "PAYMENT_VERIFIED",
          intentId: intent.id,
          orderId: createdOrder.id,
          paymentId: updatedPayment.id,
          metadata: { razorpayOrderId, razorpayPaymentId } as never,
        },
      });

      await tx.auditEvent.create({
        data: {
          type: "ORDER_CREATED",
          intentId: intent.id,
          orderId: createdOrder.id,
          paymentId: updatedPayment.id,
          metadata: { total: intent.total, quantity: intent.quantity, productId: product.id } as never,
        },
      });

      return createdOrder;
    });

    return NextResponse.json({ ok: true, data: { orderId: order.id, status: order.status } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "OUT_OF_STOCK" || msg === "STOCK_NEGATIVE") {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED", razorpayPaymentId, razorpaySignature } });
      await auditLog({ type: "PAYMENT_FAILED", intentId, paymentId: payment.id, reason: msg });
      return NextResponse.json({ ok: false, error: "PAYMENT_FAILED", message: "Product unavailable" }, { status: 400 });
    }
    // unique constraint violation -> duplicate order
    if (msg.includes("Unique constraint")) {
      const existingOrder = await prisma.order.findUnique({ where: { intentId } });
      if (existingOrder) {
        return NextResponse.json({ ok: true, data: { orderId: existingOrder.id, status: existingOrder.status } });
      }
    }
    console.error("[payment/verify] transaction failed", e);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR", message: "Verification failed" }, { status: 500 });
  }
}
