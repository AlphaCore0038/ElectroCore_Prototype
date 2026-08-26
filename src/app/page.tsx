"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { AIProcessing } from "@/components/ai-processing";

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

export default function Home() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);

  // purchase state
  const [productSlug, setProductSlug] = useState("sony-wh-1000xm5");
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
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
    setPurchaseSuccess(null);
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
            setPurchaseSuccess(`Payment verified. Order ${verifyJson.data!.orderId} created.`);
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
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-sm font-semibold tracking-tight text-zinc-100">ElectroCore</p>
            <p className="text-xs tracking-widest text-zinc-500 uppercase">AI Shopping Assistant</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/merchant" className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-800">Merchant →</Link>
            <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">Track 01 · Pay</span>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6 sm:px-6">
            {msgs.length === 0 && !loading && (
              <div className="py-8 animate-in fade-in">
                <h1 className="text-2xl font-semibold tracking-tight">What are you shopping for?</h1>
                <p className="mt-2 text-sm leading-6 text-zinc-400">Ask in plain language. Real products, real prices, real availability from the ElectroCore catalog.</p>
                <div className="mt-6 grid gap-2">
                  {[
                    "What headphones do you have?",
                    "I need a keyboard under \u20B95,000",
                    "Is the Logitech MX Master 3S in stock?",
                    "Tell me about the Sony WH-1000XM5",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-left text-sm text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m, i) => {
              const isAssistant = m.role === "assistant";
              const found = isAssistant && catalog.length ? findProductsInText(m.content) : [];
              const showComparison = isAssistant && isComparison(m.content, found) && found.length >= 2;
              const showCard = isAssistant && found.length === 1 && !showComparison;
              // extract WHY bullets if present in text after recommendation
              const whyBullets = isAssistant ? m.content.split("\n").filter((l) => l.trim().startsWith("•") || l.trim().startsWith("-") || l.trim().startsWith("✓")).slice(0, 4) : [];

              return (
                <div key={i} className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
                  <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap ${m.role === "user" ? "bg-zinc-100 text-zinc-900" : "border border-zinc-800 bg-zinc-900 text-zinc-100"}`}>
                      {m.content}
                    </div>
                  </div>

                  {showCard && found[0] && (
                    <div className="ml-0 max-w-[85%]">
                      <ProductCard
                        product={found[0]}
                        variant="ai-pick"
                        onCompare={() => handleCompare(found[0].slug, catalog.find((p) => p.slug !== found[0].slug)?.slug || "jbl-flip-6")}
                        onBuy={() => handleBuy(found[0].slug)}
                      />
                      {whyBullets.length > 0 && (
                        <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2">
                          <p className="text-[11px] font-medium tracking-widest text-zinc-500 uppercase">Why this fits</p>
                          <ul className="mt-1 space-y-1 text-xs leading-5 text-zinc-400">
                            {whyBullets.map((b, idx) => (
                              <li key={idx}>{b.trim()}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {showComparison && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {found.slice(0, 2).map((p) => (
                        <ProductCard key={p.slug} product={p} onBuy={() => handleBuy(p.slug)} />
                      ))}
                    </div>
                  )}

                  {showComparison && (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                      <p className="text-[11px] font-medium tracking-widest text-zinc-500 uppercase">AI Verdict</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-400">Grounded comparison above — facts from catalog, reasoning from your request.</p>
                    </div>
                  )}
                </div>
              );
            })}

            {loading && <AIProcessing />}

            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-zinc-800 bg-zinc-950">
          <div className="mx-auto w-full max-w-2xl px-4 py-4 sm:px-6 space-y-3">
            <div id="purchase-panel" className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-sm">
              <p className="text-xs font-medium tracking-widest text-zinc-400 uppercase">Purchase Review</p>
              <p className="mt-1 text-xs text-zinc-500">Your approval is required. Price is server-calculated.</p>
              <div className="mt-3 flex gap-2">
                <select
                  value={productSlug}
                  onChange={(e) => setProductSlug(e.target.value)}
                  className="flex-1 rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none"
                  aria-label="Select product to purchase"
                >
                  {PRODUCTS.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleApproveAndPay}
                  disabled={purchaseLoading}
                  className="rounded-full bg-zinc-100 px-6 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                >
                  {purchaseLoading ? "Processing…" : "Approve & Pay"}
                </button>
              </div>

              {intent && (
                <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-xs font-medium tracking-widest text-zinc-500 uppercase">Why I&apos;m recommending this</p>
                  <p className="mt-2 text-sm text-zinc-300">
                    {intent.product.name} — {formatPaise(intent.unitPrice)} × 1
                  </p>
                  <div className="my-3 h-px bg-zinc-800" />
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Total</span>
                    <span className="font-medium text-zinc-100">{formatPaise(intent.total)}</span>
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
                    <span className="text-emerald-500">🔒</span> Your approval is required
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">Intent {intent.intentId.slice(0, 8)}… expires in 10 min</p>
                </div>
              )}
              {purchaseError && <p className="mt-2 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">{purchaseError}</p>}
              {purchaseSuccess && (
                <div className="mt-3 rounded-xl border border-emerald-900/50 bg-emerald-950/40 p-4">
                  <p className="text-sm font-medium text-emerald-300">✓ Order Confirmed</p>
                  <p className="mt-1 text-sm text-emerald-200">{purchaseSuccess}</p>
                  <p className="mt-2 flex flex-wrap gap-2 text-xs text-emerald-300/80">
                    <span>✓ Payment verified</span>
                    <span>✓ Inventory updated</span>
                  </p>
                  {orderId && <p className="mt-2 text-xs font-mono text-zinc-400">Order ID: {orderId}</p>}
                </div>
              )}

              {orderId && intent && (
                <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-xs font-medium tracking-widest text-zinc-400 uppercase">You might also like</p>
                  {!postRec && (
                    <button onClick={() => fetchPostPurchase(intent.product.slug)} disabled={postRecLoading} className="mt-3 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-zinc-700">
                      {postRecLoading ? "Finding…" : `Find complement for ${intent.product.name}`}
                    </button>
                  )}
                  {postRec && postRec.recommendation && (
                    <div className="mt-3">
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
                      <p className="mt-2 text-xs leading-5 text-zinc-400">AI: {postRec.reason}</p>
                    </div>
                  )}
                  {postRec && !postRec.recommendation && <p className="mt-2 text-xs text-zinc-400">{postRec.reason}</p>}
                </div>
              )}

              {audit.length > 0 && (
                <div className="mt-3 border-t border-zinc-800 pt-3">
                  <p className="text-xs font-medium text-zinc-400">Audit trail</p>
                  <ul className="mt-1 space-y-1">
                    {audit.map((a, idx) => (
                      <li key={idx} className="flex justify-between text-xs text-zinc-500">
                        <span>{a.type}{a.reason ? ` — ${a.reason}` : ""}</span>
                        <span>{new Date(a.createdAt).toLocaleTimeString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {error && <p className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-2 text-sm text-red-300">{error}</p>}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={"Ask about products — e.g. wireless headphones under ₹3,000"}
                maxLength={500}
                disabled={loading}
                className="flex-1 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none disabled:opacity-50"
                aria-label="Ask shopping assistant"
              />
              <button
                onClick={send}
                disabled={loading || input.trim().length === 0}
                className="rounded-full bg-zinc-100 px-6 py-3 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                aria-label="Send message"
              >
                Send
              </button>
            </div>
            <p className="text-xs text-zinc-600">Grounded in the real ElectroCore catalog. Payment via Razorpay test mode. No invented products or prices.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
