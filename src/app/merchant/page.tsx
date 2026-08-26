"use client";

import Link from "next/link";
import { useState } from "react";

const PRODUCTS = [
  { slug: "sony-wh-1000xm5", label: "Sony WH-1000XM5 — ₹29,990" },
  { slug: "keychron-k3-max", label: "Keychron K3 Max — ₹16,490" },
  { slug: "logitech-mx-master-3s", label: "Logitech MX Master 3S — ₹9,990" },
  { slug: "anker-powercore-20000", label: "Anker PowerCore — ₹3,990" },
  { slug: "anker-usb-c-100w", label: "Anker Cable 100W — ₹1,490" },
  { slug: "samsung-t7-1tb", label: "Samsung T7 1TB — ₹8,990" },
  { slug: "laptop-sleeve-14", label: "Laptop Sleeve 14 — ₹2,490" },
  { slug: "logitech-brio-4k", label: "Logitech Brio — ₹7,490" },
  { slug: "jbl-flip-6", label: "JBL Flip 6 — ₹11,990" },
  { slug: "usb-c-hub-7in1", label: "Anker Hub 7-in-1 — ₹4,990" },
];

function formatPaise(p: number) {
  return `₹${(p / 100).toFixed(2).replace(/\.00$/, "")}`;
}

export default function MerchantPage() {
  const [product, setProduct] = useState("sony-wh-1000xm5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ recommendation: { slug: string; name: string; price: number; currency: string; category: string; description: string } | null; reason: string | null; source?: { name: string } } | null>(null);

  async function find() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/merchant/cross-sell?product=${encodeURIComponent(product)}`);
      const json = (await res.json()) as { ok: boolean; data?: { recommendation: { slug: string; name: string; price: number; currency: string; category: string; description: string } | null; reason: string | null; source: { name: string } }; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message || "Failed to get recommendation");
        return;
      }
      setData(json.data ?? null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-sm font-semibold tracking-tight text-zinc-100">ElectroCore</p>
            <p className="text-xs tracking-widest text-zinc-500 uppercase">AI Merchant Advisor</p>
          </div>
          <Link href="/" className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-800">
            Buyer →
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-xl font-semibold tracking-tight">Cross-sell Advisor</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">What should I recommend to a customer who just bought this product? Uses real catalog, ACTIVE & in-stock only.</p>

        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex gap-2">
            <select value={product} onChange={(e) => setProduct(e.target.value)} className="flex-1 rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none">
              {PRODUCTS.map((p) => (
                <option key={p.slug} value={p.slug}>{p.label}</option>
              ))}
            </select>
            <button onClick={find} disabled={loading} className="rounded-full bg-zinc-100 px-6 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-40">
              {loading ? "Thinking…" : "Find Cross-Sell"}
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Deterministic candidates from compatibleWith + category, LLM explains the best fit.</p>
        </div>

        {error && <p className="mt-4 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}

        {data && (
          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            {data.recommendation ? (
              <>
                <p className="text-xs font-medium tracking-widest text-zinc-500 uppercase">Recommended complement</p>
                <p className="mt-2 text-base font-medium text-zinc-100">{data.recommendation.name}</p>
                <p className="text-sm text-zinc-400">{data.recommendation.description}</p>
                <p className="mt-2 text-sm text-zinc-300">{formatPaise(data.recommendation.price)} · {data.recommendation.category} · {data.recommendation.slug}</p>
                <p className="mt-3 rounded-lg bg-zinc-950 px-3 py-2 text-sm leading-6 text-zinc-300">AI: {data.reason}</p>
              </>
            ) : (
              <p className="text-sm text-zinc-400">{data.reason}</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
