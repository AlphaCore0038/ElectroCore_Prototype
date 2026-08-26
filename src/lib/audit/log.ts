import { prisma } from "@/lib/db";

type AuditInput = {
  type: string;
  intentId?: string | null;
  orderId?: string | null;
  paymentId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function auditLog(input: AuditInput) {
  try {
    await prisma.auditEvent.create({
      data: {
        type: input.type,
        intentId: input.intentId ?? undefined,
        orderId: input.orderId ?? undefined,
        paymentId: input.paymentId ?? undefined,
        reason: input.reason ?? undefined,
        metadata: (input.metadata as never) ?? undefined,
      },
    });
  } catch (e) {
    console.error("[audit] failed", input.type, e);
  }
}
