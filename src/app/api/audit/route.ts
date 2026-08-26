import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const intentId = searchParams.get("intentId")?.trim() || "";
  if (!intentId) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "intentId is required." }, { status: 400 });
  }
  const takeRaw = searchParams.get("take");

  let take: number | undefined;
  if (takeRaw !== null) {
    const n = Number(takeRaw);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "take must be 1-100" }, { status: 400 });
    }
    take = n;
  }

  const where: Record<string, unknown> = { intentId };

  const events = await prisma.auditEvent.findMany({
    where: where as never,
    orderBy: { createdAt: "asc" },
    take: take ?? 50,
  });

  return NextResponse.json({ ok: true, data: { events } });
}
