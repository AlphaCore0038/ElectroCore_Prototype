"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { TopBar } from "@/components/top-bar";
import { LeftNav } from "@/components/left-nav";

type Rec = {
  slug: string;
  name: string;
  price: number;
  currency: string;
  stock: number;
  status: string;
  description: string;
  attributes: { brand?: string; connectivity?: string; compatibleWith?: string[] } | null;
  imageUrl: string | null;
  reason: string | null;
};

export default function RecommendationsPage() {
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const ordersRes = await fetch("/api/orders");
        const ordersJson = (await ordersRes.json()) as { data?: { items: { slug: string }[] }[] };
        const orders = ordersJson.data || [];
        const productSlugs = [...new Set(orders.flatMap((o) => o.items.map((i) => i.slug)))].slice(0, 5);

        if (productSlugs.length === 0) { setLoading(false); return; }

        const results: Rec[] = [];
        for (const slug of productSlugs) {
          try {
            const r = await fetch(`/api/merchant/cross-sell?product=${encodeURIComponent(slug)}`);
            const j = (await r.json()) as { ok: boolean; data?: { recommendation: Rec | null; reason: string | null } };
            if (j.ok && j.data?.recommendation) {
              results.push({ ...j.data.recommendation, reason: j.data.reason });
            }
          } catch {}
        }
        setRecs(results);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-zinc-950 text-zinc-100">
      <TopBar mobileNavOpen={mobileNav} onToggleNav={() => setMobileNav(!mobileNav)} />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:flex"><LeftNav /></div>
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-6">
              <div className="mb-6">
                <h1 className="text-xl font-bold tracking-tight">Recommendations</h1>
                <p className="mt-1 text-[11px] text-zinc-500">AI-powered product suggestions based on your activity</p>
              </div>

              {loading ? (
                <div className="py-12 text-center text-sm text-zinc-500">Loading…</div>
              ) : recs.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-zinc-800/80 mb-4">
                    <span className="text-2xl font-bold text-zinc-300">◎</span>
                  </div>
                  <p className="text-sm text-zinc-400">No recommendations yet</p>
                  <p className="mt-1 text-[11px] text-zinc-600">Complete a purchase to let ElectroCore learn what you&apos;re looking for.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-[10px] text-zinc-600">{recs.length} recommendation{recs.length !== 1 ? "s" : ""}</p>
                  {recs.map((r) => (
                    <div key={r.slug} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover-glow">
                      <div className="max-w-sm">
                        <ProductCard product={r} variant="complement" />
                      </div>
                      {r.reason && (
                        <div className="mt-3 rounded-lg bg-zinc-950 px-3 py-2">
                          <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-1">Why this product</p>
                          <p className="text-[11px] leading-4.5 text-zinc-400">{r.reason}</p>
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full border border-emerald-900/50 bg-emerald-950/40 px-3 py-1 text-[11px] text-emerald-300">✓ Compatible</span>
                        <span className="rounded-full border border-emerald-900/50 bg-emerald-950/40 px-3 py-1 text-[11px] text-emerald-300">✓ In stock</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
