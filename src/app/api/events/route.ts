import { NextResponse } from "next/server";
import { readRecentEvents } from "@/lib/event-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitRaw = searchParams.get("limit");
  let limit = 50;
  if (limitRaw) {
    const n = Number(limitRaw);
    if (Number.isInteger(n) && n >= 1 && n <= 100) limit = n;
  }
  const events = readRecentEvents(limit);
  return NextResponse.json({ ok: true, data: events });
}
