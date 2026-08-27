"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { AIProcessing } from "@/components/ai-processing";
import { LeftNav } from "@/components/left-nav";
import { ContextPanel } from "@/components/context-panel";

type Msg = { role: "user" | "assistant"; content: string };

type CatalogProduct = {
  slug: string;
  name: string;
  price: number;
  currency: string;
  stock: number;
  status: string;
  description: string;
  attributes: { brand?: string; connectivity?: string; specs?: Record<string, string | number>; compatibleWith?: string[] } | null;
  imageUrl: string | null;
};

const PRODUCTS = [
  { slug: "sony-wh-1000xm5", label: "Sony WH-1000XM5 — ₹29,990" },
  { slug: "keychron-k3-max", label: "Keychron K3 Max — ₹16,490" },
  { slug: "logitech-mx-master-3s", label: "Logitech MX Master 3S — ₹9,990 (OOS)" },
  { slug: "anker-powercore-20000", label: "Anker PowerCore — ₹3,990" },
  { slug: "anker-usb-c-100w", label: "Anker Cable 100W — ₹1,490" },
  { slug: "samsung-t7-1tb", label: "Samsung T7 1TB — ₹8,990" },
  { slug: "laptop-sleeve-14", label: "Laptop Sleeve 14 — ₹2,490" },
  { slug: "logitech-brio-4k", label: "Logitech Brio — ₹7,490" },
  { slug: "jbl-flip-6", label: "JBL Flip 6 — ₹11,990" },
  { slug: "usb-c-hub-7in1", label: "Anker Hub 7-in-1 — ₹4,990" },
];

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function formatPaise(p: number) {
  return `₹${(p / 100).toFixed(2).replace(/\.00$/, "")}`;
}

function ComparisonTable({ products, onBuy }: { products: CatalogProduct[]; onBuy: (s: string) => void }) {
  const a = products[0];
  const b = products[1];
  if (!a || !b) return null;

  const allSpecKeys = new Set<string>();
  [a, b].forEach((p) => {
    if (p.attributes?.specs) Object.keys(p.attributes.specs).forEach((k) => allSpecKeys.add(k));
  });

  const rows: { label: string; a: string; b: string }[] = [
    { label: "Price", a: formatPaise(a.price), b: formatPaise(b.price) },
    { label: "Availability", a: a.stock > 0 ? "In stock" : "Out of stock", b: b.stock > 0 ? "In stock" : "Out of stock" },
  ];
  if (a.attributes?.connectivity || b.attributes?.connectivity) {
    rows.push({ label: "Connectivity", a: a.attributes?.connectivity || "—", b: b.attributes?.connectivity || "—" });
  }
  if (a.attributes?.brand || b.attributes?.brand) {
    rows.push({ label: "Brand", a: a.attributes?.brand || "—", b: b.attributes?.brand || "—" });
  }
  for (const k of allSpecKeys) {
    rows.push({
      label: k,
      a: a.attributes?.specs?.[k] != null ? String(a.attributes.specs[k]) : "—",
      b: b.attributes?.specs?.[k] != null ? String(b.attributes.specs[k]) : "—",
    });
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="grid grid-cols-3 border-b border-zinc-800 text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
        <div className="px-3 py-2" />
        <div className="px-3 py-2 text-zinc-300 truncate">{a.attributes?.brand || a.name.split(" ")[0]}</div>
        <div className="px-3 py-2 text-zinc-300 truncate">{b.attributes?.brand || b.name.split(" ")[0]}</div>
      </div>
      {rows.map((r, i) => (
        <div key={r.label} className={`grid grid-cols-3 text-[11px] ${i < rows.length - 1 ? "border-b border-zinc-800/50" : ""}`}>
          <div className="px-3 py-2 text-zinc-500 font-medium">{r.label}</div>
          <div className="px-3 py-2 text-zinc-300">{r.a}</div>
          <div className="px-3 py-2 text-zinc-300">{r.b}</div>
        </div>
      ))}
      <div className="flex border-t border-zinc-800">
        <button onClick={() => onBuy(a.slug)} className="flex-1 py-2 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 transition-colors border-r border-zinc-800">
          Buy {a.attributes?.brand || a.name.split(" ")[0]}
        </button>
        <button onClick={() => onBuy(b.slug)} className="flex-1 py-2 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 transition-colors">
          Buy {b.attributes?.brand || b.name.split(" ")[0]}
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [mobileNav, setMobileNav] = useState(false);

  const [productSlug, setProductSlug] = useState("sony-wh-1000xm5");
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [intent, setIntent] = useState<{ intentId: string; total: number; unitPrice: number; product: { name: string; slug: string } } | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [audit, setAudit] = useState<{ type: string; reason?: string; createdAt: string }[]>([]);
  const [postRec, setPostRec] = useState<{ recommendation: { slug: string; name: string; price: number; description: string } | null; reason: string | null } | null>(null);
  const [postRecLoading, setPostRecLoading] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading, intent, orderId, postRec]);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.Razorpay) {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  useEffect(() => {
    fetch("/api/catalog/search?limit=20")
      .then((r) => r.json())
      .then((j: { products?: CatalogProduct[] }) => {
        if (j.products) setCatalog(j.products);
      })
      .catch(() => {});
  }, []);

  function findProductsInText(text: string): CatalogProduct[] {
    const lower = text.toLowerCase();
    return catalog.filter((p) => lower.includes(p.slug.toLowerCase()) || lower.includes(p.name.toLowerCase()));
  }

  function isComparison(text: string, found: CatalogProduct[]): boolean {
    return found.length >= 2 && /compare|vs\.?|versus|difference/i.test(text);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    if (text.length > 500) {
      setError("Message must be at most 500 characters.");
      return;
    }
    setError(null);
    const nextMsgs: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(nextMsgs);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: msgs }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { message?: { content?: string } };
        error?: string;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.message || "Something went wrong. Please try again.");
        setMsgs((m) => m.slice(0, -1));
        return;
      }
      const reply = json.data?.message?.content?.trim();
      if (!reply) {
        setError("AI returned an empty response.");
        setMsgs((m) => m.slice(0, -1));
        return;
      }
      setMsgs([...nextMsgs, { role: "assistant", content: reply }]);
    } catch {
      setError("Network error. Please try again.");
      setMsgs((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  async function fetchAudit(intentId: string) {
    try {
      const r = await fetch(`/api/audit?intentId=${intentId}`);
      const j = (await r.json()) as { data?: { events: { type: string; reason?: string; createdAt: string }[] } };
      if (j.data?.events) setAudit(j.data.events);
    } catch {}
  }

  async function fetchPostPurchase(product: string) {
    setPostRecLoading(true);
    try {
      const r = await fetch(`/api/merchant/cross-sell?product=${encodeURIComponent(product)}`);
      const j = (await r.json()) as { ok: boolean; data?: { recommendation: { slug: string; name: string; price: number; description: string } | null; reason: string | null } };
      if (j.ok && j.data) setPostRec({ recommendation: j.data.recommendation, reason: j.data.reason });
    } catch {}
    setPostRecLoading(false);
  }

  async function handleApproveAndPay() {
    setPurchaseError(null);
    setOrderId(null);
    setIntent(null);
    setAudit([]);
    setPostRec(null);
    setPurchaseLoading(true);
    try {
      const prepRes = await fetch("/api/purchase/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: productSlug, quantity: 1 }),
      });
      const prepJson = (await prepRes.json()) as {
        ok: boolean;
        data?: { intentId: string; total: number; unitPrice: number; product: { name: string; slug: string } };
        error?: string;
        message?: string;
        reason?: string;
      };
      if (!prepRes.ok || !prepJson.ok || !prepJson.data) {
        setPurchaseError(prepJson.message || prepJson.reason || "Purchase not allowed");
        if (prepJson.data?.intentId || (prepJson as { intentId?: string }).intentId) {
          const iid = (prepJson.data?.intentId || (prepJson as { intentId?: string }).intentId) as string;
          if (iid) fetchAudit(iid);
        }
        setPurchaseLoading(false);
        return;
      }
      const intentId = prepJson.data.intentId;
      setIntent(prepJson.data);
      await fetchAudit(intentId);

      const payRes = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentId }),
      });
      const payJson = (await payRes.json()) as {
        ok: boolean;
        data?: { razorpayOrderId: string; keyId: string; amount: number; currency: string };
        message?: string;
      };
      if (!payRes.ok || !payJson.ok || !payJson.data) {
        setPurchaseError(payJson.message || "Failed to create payment");
        await fetchAudit(intentId);
        setPurchaseLoading(false);
        return;
      }
      await fetchAudit(intentId);

      const { razorpayOrderId, keyId, amount, currency } = payJson.data;
      if (!window.Razorpay) {
        setPurchaseError("Razorpay not loaded. Please refresh and try again.");
        setPurchaseLoading(false);
        return;
      }

      const options = {
        key: keyId,
        amount,
        currency,
        name: "ElectroCore",
        description: prepJson.data.product.name,
        order_id: razorpayOrderId,
        handler: async function (resp: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) {
          try {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                intentId,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_signature: resp.razorpay_signature,
              }),
            });
            const verifyJson = (await verifyRes.json()) as { ok: boolean; data?: { orderId: string }; message?: string; error?: string };
            await fetchAudit(intentId);
            if (!verifyRes.ok || !verifyJson.ok) {
              setPurchaseError(verifyJson.message || "Payment verification failed. No order created.");
              return;
            }
            setOrderId(verifyJson.data!.orderId);
          } catch {
            setPurchaseError("Verification error. Please contact support.");
          } finally {
            setPurchaseLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setPurchaseLoading(false);
            setPurchaseError("Payment cancelled.");
          },
        },
        theme: { color: "#18181b" },
      };

      const rzp = new window.Razorpay!(options);
      rzp.open();
    } catch {
      setPurchaseError("Purchase failed. Please try again.");
      setPurchaseLoading(false);
    }
  }

  function handleBuy(slug: string) {
    setProductSlug(slug);
    document.getElementById("purchase-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function handleCompare(a: string, b: string) {
    setInput(`Compare ${a} and ${b}`);
    inputRef.current?.focus();
  }

  return (
    <div className="flex h-dvh flex-col bg-zinc-950 text-zinc-100">
      {/* Top Bar */}
      <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-2.5 lg:px-5 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileNav(!mobileNav)} className="lg:hidden text-zinc-400 hover:text-zinc-200 p-1" aria-label="Toggle navigation">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-300">E</div>
            <span className="text-sm font-bold tracking-tight text-zinc-100 hidden sm:inline">ElectroCore</span>
          </div>
          <span className="text-[10px] font-semibold tracking-[0.2em] text-zinc-600 uppercase hidden sm:inline">AI Commerce</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-[10px] text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
            AI ASSISTANT
          </span>
          <Link
            href="/merchant"
            className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors hidden sm:inline"
          >
            Merchant Advisor
          </Link>
        </div>
      </header>

      {/* Mobile nav overlay */}
      {mobileNav && (
        <div className="lg:hidden border-b border-zinc-800 bg-zinc-950">
          <div className="px-4 py-3 space-y-1">
            <Link href="/" onClick={() => setMobileNav(false)} className="block rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100">AI Shopping</Link>
            <Link href="/merchant" onClick={() => setMobileNav(false)} className="block rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900">Merchant Advisor</Link>
          </div>
        </div>
      )}

      {/* Three-Zone Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Nav — desktop only */}
        <div className="hidden lg:flex">
          <LeftNav activePage="shop" />
        </div>

        {/* Center — Conversation + Input */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          {/* Messages scroll area */}
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-6">
              {msgs.length === 0 && !loading && (
                <div className="py-12 animate-in fade-in">
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-300">E</div>
                      <div>
                        <h1 className="text-xl font-bold tracking-tight">AI Shopping Assistant</h1>
                        <p className="text-[11px] text-zinc-500">Grounded in the real ElectroCore catalog</p>
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-zinc-400 max-w-lg">
                      Ask in plain language. Real products, real prices, real availability. The AI reasons over catalog data, recommends the best fit, and completes purchases with your approval.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    {[
                      "What headphones do you have?",
                      "I need a keyboard under ₹5,000",
                      "Is the Logitech MX Master 3S in stock?",
                      "Tell me about the Sony WH-1000XM5",
                    ].map((s) => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-left text-sm text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
                    <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-2">How it works</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-zinc-500">
                      <div><span className="text-zinc-300 font-medium">Understand</span><br/>Parse your intent</div>
                      <div><span className="text-zinc-300 font-medium">Discover</span><br/>Search catalog</div>
                      <div><span className="text-zinc-300 font-medium">Recommend</span><br/>Best match</div>
                      <div><span className="text-zinc-300 font-medium">Purchase</span><br/>Your approval</div>
                    </div>
                  </div>
                </div>
              )}

              {msgs.map((m, i) => {
                const isAssistant = m.role === "assistant";
                const found = isAssistant && catalog.length ? findProductsInText(m.content) : [];
                const showComparison = isAssistant && isComparison(m.content, found) && found.length >= 2;
                const showCard = isAssistant && found.length === 1 && !showComparison;
                const whyBullets = isAssistant ? m.content.split("\n").filter((l) => l.trim().startsWith("•") || l.trim().startsWith("-") || l.trim().startsWith("✓")).slice(0, 5) : [];
                const aiVerdict = isAssistant ? m.content.split("\n").filter((l) => /verdict|recommend|best fit|overall|summary/i.test(l)).slice(0, 2).join(" ") : "";

                return (
                  <div key={i} className="mb-4 animate-in fade-in slide-in-from-bottom duration-300">
                    {m.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-zinc-100 px-4 py-2.5 text-sm leading-6 text-zinc-900">
                          {m.content}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 h-5 w-5 shrink-0 rounded bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-400">AI</div>
                          <div className="max-w-[85%] text-sm leading-6 text-zinc-200 whitespace-pre-wrap">{m.content}</div>
                        </div>

                        {showCard && found[0] && (
                          <div className="ml-7 max-w-md space-y-2.5">
                            <ProductCard
                              product={found[0]}
                              variant="ai-pick"
                              onCompare={() => handleCompare(found[0].slug, catalog.find((p) => p.slug !== found[0].slug)?.slug || "jbl-flip-6")}
                              onBuy={() => handleBuy(found[0].slug)}
                            />
                            {whyBullets.length > 0 && (
                              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5">
                                <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-1.5">Why this fits</p>
                                <ul className="space-y-0.5">
                                  {whyBullets.map((b, idx) => (
                                    <li key={idx} className="text-[11px] leading-4.5 text-zinc-400">{b.trim()}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {aiVerdict && (
                              <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5">
                                <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-1">AI Verdict</p>
                                <p className="text-[11px] leading-4.5 text-zinc-400">{aiVerdict}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {showComparison && (
                          <div className="ml-7 max-w-lg space-y-2.5">
                            <ComparisonTable products={found.slice(0, 2)} onBuy={handleBuy} />
                            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5">
                              <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-1">AI Verdict</p>
                              <p className="text-[11px] leading-4.5 text-zinc-400">Grounded comparison — facts from catalog, reasoning from your request.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && <AIProcessing />}

              {/* Purchase Review */}
              {intent && !orderId && (
                <div id="purchase-panel" className="mt-4 animate-in fade-in">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                    <div className="border-b border-zinc-800 px-4 py-2.5">
                      <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase">Purchase Review</p>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-baseline justify-between">
                        <p className="text-sm font-semibold text-zinc-100">{intent.product.name}</p>
                        <p className="text-sm font-bold text-zinc-100">{formatPaise(intent.total)}</p>
                      </div>
                      <div className="rounded-lg bg-zinc-950 px-3 py-2">
                        <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-1">Why I&apos;m recommending this</p>
                        <p className="text-[11px] text-zinc-400">{intent.product.name} — server-validated price, ACTIVE status, in stock.</p>
                      </div>
                      <div className="h-px bg-zinc-800" />
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Total</span>
                        <span className="font-bold text-zinc-100">{formatPaise(intent.total)}</span>
                      </div>
                      <p className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                        <span className="text-emerald-500">🔒</span> Your approval is required
                      </p>
                      <p className="text-[10px] text-zinc-600">Intent {intent.intentId.slice(0, 8)}… expires in 10 min</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Confirmation */}
              {orderId && (
                <div className="mt-4 animate-in fade-in">
                  <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 overflow-hidden">
                    <div className="border-b border-emerald-900/30 px-4 py-2.5">
                      <p className="text-[10px] font-semibold tracking-[0.15em] text-emerald-400 uppercase">✓ Order Confirmed</p>
                    </div>
                    <div className="p-4 space-y-2">
                      <p className="text-sm font-semibold text-emerald-200">{intent?.product.name}</p>
                      <p className="text-sm text-emerald-300">{intent ? formatPaise(intent.total) : ""}</p>
                      <div className="rounded-lg bg-emerald-950/50 px-3 py-2 font-mono text-[11px] text-emerald-400/70">{orderId}</div>
                      <div className="flex gap-3 text-[11px] text-emerald-400/80">
                        <span>✓ Payment verified</span>
                        <span>✓ Inventory updated</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Post-purchase complement */}
              {orderId && (
                <div className="mt-4 animate-in fade-in">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                    <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-2">You might also like</p>
                    {!postRec && (
                      <button
                        onClick={() => fetchPostPurchase(intent!.product.slug)}
                        disabled={postRecLoading}
                        className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
                      >
                        {postRecLoading ? "Finding…" : `Find complement for ${intent!.product.name}`}
                      </button>
                    )}
                    {postRec?.recommendation && (
                      <div className="mt-2">
                        <ProductCard
                          product={
                            catalog.find((p) => p.slug === postRec.recommendation!.slug) || {
                              slug: postRec.recommendation.slug,
                              name: postRec.recommendation.name,
                              price: postRec.recommendation.price,
                              currency: "INR",
                              stock: 1,
                              status: "ACTIVE",
                              description: postRec.recommendation.description,
                              attributes: null,
                              imageUrl: null,
                            }
                          }
                          variant="complement"
                          onBuy={() => handleBuy(postRec.recommendation!.slug)}
                        />
                        {postRec.reason && <p className="mt-2 text-[11px] leading-4.5 text-zinc-500">AI: {postRec.reason}</p>}
                      </div>
                    )}
                    {postRec && !postRec.recommendation && <p className="mt-2 text-[11px] text-zinc-500">{postRec.reason}</p>}
                  </div>
                </div>
              )}

              {/* Audit trail */}
              {audit.length > 0 && (
                <div className="mt-4 border-t border-zinc-800 pt-3">
                  <p className="text-[10px] font-medium text-zinc-500 mb-1">Audit trail</p>
                  <ul className="space-y-0.5">
                    {audit.map((a, idx) => (
                      <li key={idx} className="flex justify-between text-[10px] text-zinc-600">
                        <span>{a.type}{a.reason ? ` — ${a.reason}` : ""}</span>
                        <span>{new Date(a.createdAt).toLocaleTimeString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Purchase Bar — above input */}
          <div className="border-t border-zinc-800 bg-zinc-950/80 shrink-0">
            <div className="mx-auto w-full max-w-3xl px-4 py-2 lg:px-6">
              <div id="purchase-panel" className="flex items-center gap-2">
                <select
                  value={productSlug}
                  onChange={(e) => setProductSlug(e.target.value)}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[11px] text-zinc-300 focus:border-zinc-600 focus:outline-none"
                  aria-label="Select product to purchase"
                >
                  {PRODUCTS.map((p) => (
                    <option key={p.slug} value={p.slug}>{p.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleApproveAndPay}
                  disabled={purchaseLoading || !!orderId}
                  className="rounded-lg bg-zinc-100 px-4 py-1.5 text-[11px] font-medium text-zinc-900 hover:bg-white disabled:opacity-30 focus:outline-none focus:ring-1 focus:ring-zinc-300 transition-colors"
                >
                  {purchaseLoading ? "Processing…" : orderId ? "Purchased" : "Approve & Pay"}
                </button>
                {purchaseError && <span className="text-[10px] text-red-400 truncate max-w-[200px]">{purchaseError}</span>}
              </div>
            </div>
          </div>

          {/* Input Bar — fixed at bottom of center zone */}
          <div className="border-t border-zinc-800 bg-zinc-950 shrink-0">
            <div className="mx-auto w-full max-w-3xl px-4 py-3 lg:px-6">
              {error && (
                <p className="mb-2 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-1.5 text-[11px] text-red-300">{error}</p>
              )}
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Ask about products — e.g. wireless headphones under ₹30,000"
                  maxLength={500}
                  disabled={loading}
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 disabled:opacity-50 transition-colors"
                  aria-label="Ask shopping assistant"
                />
                <button
                  onClick={send}
                  disabled={loading || input.trim().length === 0}
                  className="rounded-xl bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-zinc-300 transition-colors"
                  aria-label="Send message"
                >
                  Send →
                </button>
              </div>
              <p className="mt-1.5 text-[10px] text-zinc-700">Catalog grounded · Payment via Razorpay test mode · No invented products or prices</p>
            </div>
          </div>
        </div>

        {/* Right Context Panel — desktop only */}
        <div className="hidden lg:flex">
          <ContextPanel msgs={msgs} intent={intent} orderId={orderId} postRec={postRec} />
        </div>
      </div>
    </div>
  );
}
