import { NextResponse } from "next/server";
import { getConversationWithMessages, deleteConversation } from "@/lib/conversations/queries";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id || typeof id !== "string" || id.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "id is required" }, { status: 400 });
  }
  const conversation = await getConversationWithMessages(id.trim());
  if (!conversation) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND", message: "Conversation not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: conversation });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id || typeof id !== "string" || id.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "id is required" }, { status: 400 });
  }
  const deleted = await deleteConversation(id.trim());
  if (!deleted) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND", message: "Conversation not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
