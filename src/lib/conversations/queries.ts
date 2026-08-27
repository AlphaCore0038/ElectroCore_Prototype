import { prisma } from "@/lib/db";

export async function createConversation(title?: string) {
  return prisma.conversation.create({ data: { title: title ?? null } });
}

export async function getConversations(limit = 20) {
  return prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });
}

export async function getConversationWithMessages(id: string) {
  return prisma.conversation.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" }, select: { id: true, role: true, content: true, createdAt: true } },
    },
  });
}

export async function addMessage(conversationId: string, role: string, content: string) {
  const msg = await prisma.message.create({
    data: { conversationId, role, content },
  });
  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
  return msg;
}

export async function deleteConversation(id: string): Promise<boolean> {
  const conversation = await prisma.conversation.findUnique({ where: { id }, select: { id: true } });
  if (!conversation) return false;
  // Detach any orders referencing this conversation before deleting
  await prisma.order.updateMany({ where: { conversationId: id }, data: { conversationId: null } });
  await prisma.conversation.delete({ where: { id } });
  return true;
}

export async function clearConversations(): Promise<void> {
  // Detach all orders from conversations before deleting
  await prisma.order.updateMany({ where: { conversationId: { not: null } }, data: { conversationId: null } });
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
}

export function generateTitle(content: string): string {
  let t = content.trim();
  t = t.replace(/^(i need|i want|tell me about|show me|find me|can you|could you|please|i'm looking for|i am looking for)\s+/i, "");
  t = t.replace(/\.$/, "");
  if (t.length > 60) t = t.slice(0, 60).replace(/\s+\S*$/, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}
