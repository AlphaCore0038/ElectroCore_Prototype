import crypto from "crypto";

type CreateOrderInput = {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
};

type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
};

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

export async function createRazorpayOrder(input: CreateOrderInput): Promise<RazorpayOrder> {
  const cfg = getRazorpayConfig();
  if (!cfg) throw new Error("Razorpay not configured");

  const auth = Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes ?? {},
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[razorpay] create order failed", res.status, text.slice(0, 500));
    throw new Error(`Razorpay order failed: ${res.status}`);
  }

  const json = (await res.json()) as RazorpayOrder;
  if (!json.id) throw new Error("Razorpay order missing id");
  return json;
}

export function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  const payload = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (expected.length !== signature.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
