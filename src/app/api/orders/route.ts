import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitRaw = searchParams.get("limit");
  let limit = 20;
  if (limitRaw) {
    const n = Number(limitRaw);
    if (Number.isInteger(n) && n >= 1 && n <= 50) limit = n;
  }

  const orders = await prisma.order.findMany({
    include: {
      items: true,
      payment: { select: { status: true, razorpayPaymentId: true, verifiedAt: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const safe = orders.map((o) => ({
    id: o.id,
    total: o.total,
    currency: o.currency,
    status: o.status,
    createdAt: o.createdAt,
    items: o.items.map((i) => ({ name: i.name, slug: i.slug, unitPrice: i.unitPrice, quantity: i.quantity, total: i.total })),
    payment: o.payment ? { status: o.payment.status, verifiedAt: o.payment.verifiedAt } : null,
    intentId: o.intentId,
  }));

  return NextResponse.json({ ok: true, data: safe });
}
