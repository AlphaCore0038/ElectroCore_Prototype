export function PurchaseJourney({
  audit,
  intent,
  orderId,
  purchaseLoading,
}: {
  audit: { type: string; reason?: string; createdAt: string }[];
  intent: { intentId: string; total: number; product: { name: string } } | null;
  orderId: string | null;
  purchaseLoading: boolean;
}) {
  const hasIntent = !!intent;
  const hasPayment = audit.some((a) => a.type === "PAYMENT_ORDER_CREATED" || a.type === "RAZORPAY_ORDER_CREATED");
  const hasVerified = audit.some((a) => a.type === "PAYMENT_VERIFIED" || a.type === "ORDER_CREATED");
  const hasOrder = !!orderId;

  const steps = [
    { label: "Intent created", done: hasIntent, active: purchaseLoading && !hasPayment },
    { label: "Purchase prepared", done: hasIntent, active: purchaseLoading && !hasPayment },
    { label: "Payment order created", done: hasPayment, active: purchaseLoading && hasPayment && !hasVerified },
    { label: "Payment verified", done: hasVerified, active: false },
    { label: "Order created", done: hasOrder, active: false },
  ];

  if (!hasIntent && !purchaseLoading) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="border-b border-zinc-800 px-4 py-2.5">
        <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase">Purchase Journey</p>
      </div>
      <div className="p-4">
        <div className="space-y-0">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                {s.done ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] text-emerald-500">✓</span>
                ) : s.active ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] text-zinc-400 animate-pulse-dot">●</span>
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-600">○</span>
                )}
                {i < steps.length - 1 && (
                  <div className={`w-px h-4 ${s.done ? "bg-emerald-500/30" : "bg-zinc-800"}`} />
                )}
              </div>
              <div className="pb-3">
                <p className={`text-[11px] leading-4 ${s.done ? "text-zinc-300" : s.active ? "text-zinc-400" : "text-zinc-600"}`}>
                  {s.label}
                </p>
              </div>
            </div>
          ))}
        </div>
        {orderId && (
          <div className="mt-2 rounded-lg bg-zinc-950 px-3 py-2">
            <p className="text-[10px] text-zinc-500">Order ID</p>
            <p className="text-[11px] font-mono text-zinc-400 mt-0.5 truncate">{orderId}</p>
          </div>
        )}
      </div>
    </div>
  );
}
