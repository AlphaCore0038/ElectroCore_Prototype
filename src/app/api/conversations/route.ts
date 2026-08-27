import { NextResponse } from "next/server";
import { getConversations, createConversation, clearConversations } from "@/lib/conversations/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitRaw = searchParams.get("limit");
  let limit = 20;
  if (limitRaw) {
    const n = Number(limitRaw);
    if (Number.isInteger(n) && n >= 1 && n <= 50) limit = n;
  }
  const conversations = await getConversations(limit);
  return NextResponse.json({ ok: true, data: conversations });
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { body = {}; }
  const b = body as { title?: unknown };
  const title = typeof b.title === "string" ? b.title.trim() : undefined;
  const conversation = await createConversation(title || undefined);
  return NextResponse.json({ ok: true, data: { id: conversation.id, title: conversation.title } });
}

export async function DELETE() {
  await clearConversations();
  return NextResponse.json({ ok: true });
}
