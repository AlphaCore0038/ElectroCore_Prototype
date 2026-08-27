import { useMemo } from "react";

type Msg = { role: "user" | "assistant"; content: string };

type ActivityEvent = {
  time: string;
  label: string;
  detail: string;
};

function deriveActivity(
  msgs: Msg[],
  intent: { product: { name: string }; total: number } | null,
  orderId: string | null,
  postRec: { recommendation: { name: string } | null } | null
): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  const now = new Date();
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Session start
  if (msgs.length > 0) {
    events.push({ time: "JUST NOW", label: "Session started", detail: "" });
  }

  // Last user message
  const lastUser = [...msgs].reverse().find((m) => m.role === "user");
  if (lastUser) {
    events.push({ time: fmt(now), label: "Query", detail: lastUser.content.slice(0, 40) + (lastUser.content.length > 40 ? "…" : "") });
  }

  // Last recommendation
  const lastRec = [...msgs].reverse().find((m) => m.role === "assistant" && /price|₹|\bstock\b/i.test(m.content));
  if (lastRec) {
    events.push({ time: fmt(now), label: "Recommendation", detail: "Product recommended" });
  }

  // Comparison
  const lastCompare = [...msgs].reverse().find((m) => m.role === "assistant" && /compare|vs|versus/i.test(m.content));
  if (lastCompare) {
    events.push({ time: fmt(now), label: "Compared", detail: "Products compared" });
  }

  // Purchase
  if (intent) {
    events.push({ time: fmt(now), label: "Purchase prepared", detail: `₹${(intent.total / 100).toLocaleString("en-IN")}` });
  }

  // Order
  if (orderId) {
    events.push({ time: fmt(now), label: "Order confirmed", detail: orderId.slice(0, 12) + "…" });
  }

  // Post-purchase
  if (postRec?.recommendation) {
    events.push({ time: fmt(now), label: "Complement found", detail: postRec.recommendation.name });
  }

  return events.slice(0, 5);
}

export function SessionActivity({
  msgs,
  intent,
  orderId,
  postRec,
}: {
  msgs: Msg[];
  intent: { product: { name: string }; total: number } | null;
  orderId: string | null;
  postRec: { recommendation: { name: string } | null } | null;
}) {
  const events = useMemo(() => deriveActivity(msgs, intent, orderId, postRec), [msgs, intent, orderId, postRec]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="border-b border-zinc-800 px-4 py-2.5">
        <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase">Session Activity</p>
      </div>
      <div className="p-4">
        {events.length === 0 ? (
          <p className="text-[11px] text-zinc-600 italic">No activity yet.</p>
        ) : (
          <div className="space-y-2.5">
            {events.map((e, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-[9px] text-zinc-600 font-mono w-12 shrink-0 pt-0.5">{e.time}</span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-zinc-300 truncate">{e.label}</p>
                  {e.detail && <p className="text-[10px] text-zinc-500 truncate">{e.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
