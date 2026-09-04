import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appendEvent } from "@/lib/event-store";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id || typeof id !== "string" || id.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "id is required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: id.trim() }, select: { id: true, hiddenAt: true } });
  if (!order) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND", message: "Order not found" }, { status: 404 });
  }

  if (order.hiddenAt) {
    return NextResponse.json({ ok: true });
  }

  await prisma.order.update({ where: { id: id.trim() }, data: { hiddenAt: new Date() } });

  appendEvent({ type: "ORDER_HIDDEN", orderId: id.trim() });

  return NextResponse.json({ ok: true });
}
