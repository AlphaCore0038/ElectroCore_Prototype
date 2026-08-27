"use client";

import { useState } from "react";
import { ProductCard } from "@/components/product-card";
import { LeftNav } from "@/components/left-nav";
import { TopBar } from "@/components/top-bar";
import { InventoryStatus } from "@/components/inventory-status";
import { formatPaise } from "@/lib/format";
import { PRODUCTS } from "@/lib/constants";

type MerchantData = {
  recommendation: {
    slug: string;
    name: string;
    price: number;
    currency: string;
    category: string;
    description: string;
    stock?: number;
    status?: string;
    attributes?: { compatibleWith?: string[]; brand?: string; connectivity?: string; specs?: Record<string, string | number> } | null;
    imageUrl?: string | null;
  } | null;
  reason: string | null;
  source: { name: string; slug: string };
  candidates?: { slug: string; stock: number }[];
};

export default function MerchantPage() {
  const [product, setProduct] = useState("sony-wh-1000xm5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MerchantData | null>(null);
  const [mobileNav, setMobileNav] = useState(false);

  async function find() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/merchant/cross-sell?product=${encodeURIComponent(product)}`);
      const json = (await res.json()) as { ok: boolean; data?: MerchantData; message?: string };
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

  const selectedProduct = PRODUCTS.find((p) => p.slug === product);

  return (
    <div className="flex h-dvh flex-col bg-zinc-950 text-zinc-100">
      <TopBar mobileNavOpen={mobileNav} onToggleNav={() => setMobileNav(!mobileNav)} />

      {/* Three-Zone Body */}
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:flex">
          <LeftNav />
        </div>

        {/* Center */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-6">

              {/* ═══════ HERO ═══════ */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 mb-6 hover-glow">
                <div className="flex items-center gap-2 mb-3">
                  <div className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-zinc-800/80">
                    <span className="text-sm font-bold text-zinc-300">⟡</span>
                  </div>
                  <p className="text-[10px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">AI Merchant Advisor</p>
                </div>
                <h1 className="text-xl font-bold tracking-tight">Turn every purchase into a smarter recommendation.</h1>
                <p className="mt-2 text-sm leading-6 text-zinc-400 max-w-lg">
                  Cross-sell intelligence grounded in catalog truth — compatibleWith, category, stock and price. No invented products, no fake metrics.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-[10px] text-zinc-500">Deterministic candidates</span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-[10px] text-zinc-500">LLM reasoning only on explanation</span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-[10px] text-zinc-500">Stock-aware</span>
                </div>
              </div>

              {/* ═══════ CROSS-SELL SELECTOR ═══════ */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 mb-6">
                <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-2">Select purchased product</p>
                <div className="flex gap-2">
                  <select
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none transition-colors"
                    aria-label="Select product"
                  >
                    {PRODUCTS.map((p) => (
                      <option key={p.slug} value={p.slug}>{p.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={find}
                    disabled={loading}
                    className="rounded-xl bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-zinc-300 transition-colors"
                  >
                    {loading ? "Thinking…" : "Find Cross-Sell"}
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-zinc-600">Deterministic candidates from ACTIVE in-stock catalog, LLM explains the best fit.</p>
              </div>

              {error && (
                <p className="mb-4 rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-2.5 text-sm text-red-300">{error}</p>
              )}

              {/* ═══════ RESULTS ═══════ */}
              {data && (
                <div className="space-y-4 animate-in fade-in">
                  {data.recommendation ? (
                    <>
                      {/* Recommendation card */}
                      <div>
                        <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-3">✦ AI Cross-Sell Opportunity</p>
                        <div className="max-w-sm">
                          <ProductCard
                            product={{
                              slug: data.recommendation.slug,
                              name: data.recommendation.name,
                              price: data.recommendation.price,
                              currency: data.recommendation.currency,
                              stock: data.recommendation.stock ?? 1,
                              status: data.recommendation.status ?? "ACTIVE",
                              description: data.recommendation.description,
                              attributes: data.recommendation.attributes ?? null,
                              imageUrl: data.recommendation.imageUrl ?? null,
                            }}
                            variant="complement"
                          />
                        </div>
                      </div>

                      {/* Why This Product */}
                      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden hover-glow">
                        <div className="border-b border-zinc-800 px-4 py-2.5">
                          <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase">Why this product</p>
                        </div>
                        <div className="p-4 space-y-3">
                          <p className="text-sm leading-6 text-zinc-300">{data.reason}</p>
                          <div className="h-px bg-zinc-800" />
                          <div className="grid grid-cols-2 gap-3 text-[11px]">
                            <div>
                              <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-1">Source</p>
                              <p className="text-zinc-300">{data.source.name}</p>
                              <p className="text-zinc-500">{formatPaise(data.recommendation.price)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-1">Inventory</p>
                              <InventoryStatus stock={data.recommendation.stock ?? 1} status={data.recommendation.status ?? "ACTIVE"} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Why It Matters */}
                      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                        <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-2">Why It Matters</p>
                        <ul className="space-y-1.5 text-[11px] text-zinc-400">
                          <li className="flex items-start gap-2">
                            <span className="text-emerald-500 mt-0.5">✓</span>
                            <span>Compat: {data.recommendation.attributes?.compatibleWith?.join(", ") || data.source.name} ecosystem</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-emerald-500 mt-0.5">✓</span>
                            <span>Brand fit: {data.recommendation.attributes?.brand || "Any compatible brand"}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-emerald-500 mt-0.5">✓</span>
                            <span>Price position: {formatPaise(data.recommendation.price)} — accessible add-on</span>
                          </li>
                        </ul>
                      </div>

                      {/* Catalog Evidence */}
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                        <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-2">Catalog Evidence</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-emerald-900/50 bg-emerald-950/40 px-3 py-1 text-[11px] text-emerald-300">✓ Compatible</span>
                          <span className="rounded-full border border-emerald-900/50 bg-emerald-950/40 px-3 py-1 text-[11px] text-emerald-300">✓ In stock</span>
                          <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-[11px] text-zinc-400">Relevant category</span>
                        </div>
                        <p className="mt-2 text-[10px] text-zinc-600">
                          Evidence from deterministic find_related_products (ACTIVE, stock&gt;0, compatibleWith + category).
                        </p>
                      </div>

                      {/* Candidates */}
                      {data.candidates && data.candidates.length > 0 && (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                          <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-2">Candidates considered</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {data.candidates.map((c) => (
                              <div key={c.slug} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5">
                                <span className="text-[10px] text-zinc-500 truncate">{c.slug}</span>
                                <span className={`text-[10px] font-medium ${c.stock > 0 ? "text-zinc-500" : "text-red-400/60"}`}>
                                  {c.stock > 0 ? `${c.stock} units` : "OOS"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                      <p className="text-sm text-zinc-400">{data.reason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Context Panel */}
        <div className="hidden lg:flex">
          <aside className="flex h-full w-56 flex-col border-l border-zinc-800 bg-zinc-950 px-3 py-4 text-xs" aria-label="Context panel">
            <div className="mb-5">
              <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-2">Feature</p>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-2.5">
                <p className="text-[11px] font-medium text-zinc-200">Merchant Advisor</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Cross-sell intelligence</p>
              </div>
            </div>
            <div className="mb-5">
              <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-2">How it works</p>
              <ul className="space-y-1 text-[11px] text-zinc-500">
                <li className="flex items-center gap-1.5"><span className="text-zinc-400">1</span> Select a product</li>
                <li className="flex items-center gap-1.5"><span className="text-zinc-400">2</span> AI finds compatible</li>
                <li className="flex items-center gap-1.5"><span className="text-zinc-400">3</span> Evidence grounded</li>
              </ul>
            </div>
            <div className="mb-5">
              <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-2">Active product</p>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-2.5">
                <p className="text-[11px] text-zinc-200 truncate">{selectedProduct?.label || product}</p>
              </div>
            </div>
            <div className="mt-auto border-t border-zinc-800 pt-3">
              <p className="text-[10px] text-zinc-700">Catalog grounded</p>
              <p className="text-[10px] text-zinc-700">No fake metrics</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
