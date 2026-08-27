"use client";

import { useMemo } from "react";
import { SessionActivity } from "@/components/session-activity";
import { AIControl, type AiTelemetryData } from "@/components/ai-control";

type Msg = { role: "user" | "assistant"; content: string };

type Intent = {
  intentId: string;
  total: number;
  unitPrice: number;
  product: { name: string; slug: string };
} | null;

type PostRec = {
  recommendation: { slug: string; name: string; price: number; description: string } | null;
  reason: string | null;
} | null;

function deriveRequest(msgs: Msg[]): { label: string; value: string }[] {
  const lastUser = [...msgs].reverse().find((m) => m.role === "user");
  if (!lastUser) return [];
  const text = lastUser.content.toLowerCase();
  const tags: { label: string; value: string }[] = [];

  if (text.includes("headphone") || text.includes("headset") || text.includes("earphone")) tags.push({ label: "Category", value: "Audio" });
  if (text.includes("keyboard") || text.includes("mouse") || text.includes("keychron") || text.includes("logitech mx")) tags.push({ label: "Category", value: "Peripherals" });
  if (text.includes("cable") || text.includes("charger") || text.includes("power") || text.includes("hub")) tags.push({ label: "Category", value: "Accessories" });
  if (text.includes("speaker") || text.includes("bluetooth speaker")) tags.push({ label: "Category", value: "Speaker" });
  if (text.includes("storage") || text.includes("ssd") || text.includes("drive") || text.includes("t7")) tags.push({ label: "Category", value: "Storage" });
  if (text.includes("sleeve") || text.includes("case") || text.includes("bag")) tags.push({ label: "Category", value: "Protection" });
  if (text.includes("webcam") || text.includes("camera") || text.includes("brio")) tags.push({ label: "Category", value: "Video" });

  const priceMatch = text.match(/(?:under|below|max|budget|under)\s*[\u20b9$₹]*(\d[\d,]*)/);
  if (priceMatch) tags.push({ label: "Budget", value: `≤ ₹${priceMatch[1]}` });

  if (text.includes("wireless") || text.includes("bluetooth")) tags.push({ label: "Preference", value: "Wireless" });
  if (text.includes("wired") || text.includes("usb-c") || text.includes("usb c")) tags.push({ label: "Preference", value: "Wired" });
  if (text.includes("travel") || text.includes("portable")) tags.push({ label: "Preference", value: "Portable" });
  if (text.includes("gaming")) tags.push({ label: "Preference", value: "Gaming" });
  if (text.includes("stock") || text.includes("available")) tags.push({ label: "Requirement", value: "In stock" });
  if (text.includes("compare") || text.includes(" vs")) tags.push({ label: "Intent", value: "Compare" });

  return tags.slice(0, 6);
}

function deriveJourney(msgs: Msg[], intent: Intent, orderId: string | null) {
  const steps = [
    { label: "Understand", done: msgs.length >= 1 },
    { label: "Discover", done: msgs.some((m) => m.role === "assistant" && m.content.length > 100) },
    { label: "Evaluate", done: msgs.length >= 3 },
    { label: "Recommend", done: msgs.some((m) => m.role === "assistant" && /price|₹|\bstock\b/i.test(m.content)) },
    { label: "Approve", done: !!intent },
    { label: "Purchase", done: !!orderId },
  ];
  return steps;
}

export function ContextPanel({
  msgs,
  intent,
  orderId,
  postRec,
  catalogCount,
  purchaseLoading,
  selectedProvider,
  onSelectProvider,
  telemetry,
  aiLoading,
}: {
  msgs: Msg[];
  intent: Intent;
  orderId: string | null;
  postRec: PostRec;
  catalogCount: number;
  purchaseLoading?: boolean;
  selectedProvider: string;
  onSelectProvider: (id: string) => void;
  telemetry: AiTelemetryData;
  aiLoading: boolean;
}) {
  const requestTags = useMemo(() => deriveRequest(msgs), [msgs]);
  const steps = useMemo(() => deriveJourney(msgs, intent, orderId), [msgs, intent, orderId]);
  const completedSteps = steps.filter((s) => s.done).length;
  const hasConversation = msgs.length > 0;

  // State A: before request
  if (!hasConversation && !intent && !orderId) {
    return (
      <aside className="flex h-full w-56 flex-col border-l border-zinc-800 bg-zinc-950 px-3 py-4 text-xs overflow-y-auto" aria-label="Context panel">
        <div className="mb-4">
          <AIControl selectedProvider={selectedProvider} onSelectProvider={onSelectProvider} telemetry={telemetry} loading={aiLoading} />
        </div>

        <div className="mb-5">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-2">Discover</p>
          <ul className="space-y-1.5 text-[11px] text-zinc-500">
            <li className="flex items-center gap-1.5"><span className="text-zinc-600">→</span> Compare products</li>
            <li className="flex items-center gap-1.5"><span className="text-zinc-600">→</span> Check availability</li>
            <li className="flex items-center gap-1.5"><span className="text-zinc-600">→</span> Find recommendations</li>
          </ul>
        </div>

        <div className="mb-5">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-2">Catalog</p>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-2.5">
            <p className="text-[11px] font-medium text-zinc-300">{catalogCount} products</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">ACTIVE · real-time</p>
          </div>
        </div>

        <div className="mt-auto border-t border-zinc-800 pt-3">
          <SessionActivity msgs={msgs} intent={intent} orderId={orderId} postRec={postRec} />
        </div>
      </aside>
    );
  }

  // State B: after request (has conversation)
  if (hasConversation && !intent && !orderId) {
    return (
      <aside className="flex h-full w-56 flex-col border-l border-zinc-800 bg-zinc-950 px-3 py-4 text-xs overflow-y-auto" aria-label="Context panel">
        <div className="mb-4">
          <AIControl selectedProvider={selectedProvider} onSelectProvider={onSelectProvider} telemetry={telemetry} loading={aiLoading} />
        </div>

        <div className="mb-5">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-2">Current Request</p>
          {requestTags.length === 0 ? (
            <p className="text-[11px] text-zinc-600 italic">Analyzing...</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {requestTags.map((t) => (
                <span key={t.label} className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-400">
                  {t.value}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase">Journey</p>
            <span className="text-[9px] text-zinc-600">{completedSteps}/{steps.length}</span>
          </div>
          <ul className="space-y-1">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-2 px-1 py-0.5">
                {s.done ? (
                  <span className="text-emerald-500 text-[11px]">✓</span>
                ) : (
                  <span className="text-zinc-700 text-[11px]">○</span>
                )}
                <span className={s.done ? "text-zinc-300" : "text-zinc-600"}>{s.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto border-t border-zinc-800 pt-3">
          <SessionActivity msgs={msgs} intent={intent} orderId={orderId} postRec={postRec} />
        </div>
      </aside>
    );
  }

  // State C: purchase in progress
  if (intent && !orderId) {
    return (
      <aside className="flex h-full w-56 flex-col border-l border-zinc-800 bg-zinc-950 px-3 py-4 text-xs overflow-y-auto" aria-label="Context panel">
        <div className="mb-4">
          <AIControl selectedProvider={selectedProvider} onSelectProvider={onSelectProvider} telemetry={telemetry} loading={aiLoading} />
        </div>

        <div className="mb-5">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-2">Purchase</p>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-2.5">
            <p className="text-[11px] font-medium text-zinc-200 truncate">{intent.product.name}</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              {(intent.total / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })} INR
            </p>
          </div>
        </div>

        <div className="mb-5">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-2">Status</p>
          <ul className="space-y-1.5 text-[11px]">
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-500">✓</span>
              <span className="text-zinc-300">Server total verified</span>
            </li>
            <li className="flex items-center gap-1.5">
              {purchaseLoading ? (
                <span className="text-zinc-500 animate-pulse-dot">●</span>
              ) : (
                <span className="text-zinc-600">○</span>
              )}
              <span className={purchaseLoading ? "text-zinc-400" : "text-zinc-500"}>
                {purchaseLoading ? "Processing..." : "Approval required"}
              </span>
            </li>
          </ul>
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase">Journey</p>
            <span className="text-[9px] text-zinc-600">{completedSteps}/{steps.length}</span>
          </div>
          <ul className="space-y-1">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-2 px-1 py-0.5">
                {s.done ? (
                  <span className="text-emerald-500 text-[11px]">✓</span>
                ) : (
                  <span className="text-zinc-700 text-[11px]">○</span>
                )}
                <span className={s.done ? "text-zinc-300" : "text-zinc-600"}>{s.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto border-t border-zinc-800 pt-3">
          <SessionActivity msgs={msgs} intent={intent} orderId={orderId} postRec={postRec} />
        </div>
      </aside>
    );
  }

  // State D: after purchase
  return (
    <aside className="flex h-full w-56 flex-col border-l border-zinc-800 bg-zinc-950 px-3 py-4 text-xs overflow-y-auto" aria-label="Context panel">
      <div className="mb-4">
        <AIControl selectedProvider={selectedProvider} onSelectProvider={onSelectProvider} telemetry={telemetry} loading={aiLoading} />
      </div>

      <div className="mb-5">
        <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-2">Order Confirmed</p>
        <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-2.5 space-y-1">
          <p className="text-[11px] font-medium text-emerald-300 truncate">{intent?.product.name}</p>
          <p className="text-[10px] text-emerald-400/70">
            {intent ? `${(intent.total / 100).toLocaleString("en-IN")} INR` : ""}
          </p>
        </div>
      </div>

      <div className="mb-5">
        <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-2">Status</p>
        <ul className="space-y-1.5 text-[11px]">
          <li className="flex items-center gap-1.5">
            <span className="text-emerald-500">✓</span>
            <span className="text-zinc-300">Payment verified</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-emerald-500">✓</span>
            <span className="text-zinc-300">Order created</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-emerald-500">✓</span>
            <span className="text-zinc-300">Inventory updated</span>
          </li>
        </ul>
      </div>

      {postRec?.recommendation && (
        <div className="mb-5">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-2">AI Discovery</p>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-2.5">
            <p className="text-[10px] text-zinc-500 mb-1">Complement available</p>
            <p className="text-[11px] font-medium text-zinc-200 truncate">{postRec.recommendation.name}</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Found · {(postRec.recommendation.price / 100).toLocaleString("en-IN")} INR</p>
          </div>
        </div>
      )}

      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase">Journey</p>
          <span className="text-[9px] text-zinc-600">{steps.length}/{steps.length}</span>
        </div>
        <ul className="space-y-1">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center gap-2 px-1 py-0.5">
              <span className="text-emerald-500 text-[11px]">✓</span>
              <span className="text-zinc-300">{s.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto border-t border-zinc-800 pt-3">
        <SessionActivity msgs={msgs} intent={intent} orderId={orderId} postRec={postRec} />
      </div>
    </aside>
  );
}
