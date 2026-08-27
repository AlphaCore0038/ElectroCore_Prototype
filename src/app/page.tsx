"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { AIProcessing } from "@/components/ai-processing";
import { LeftNav } from "@/components/left-nav";
import { ContextPanel } from "@/components/context-panel";
import { ProductQuickView } from "@/components/product-quick-view";
import { PurchaseJourney } from "@/components/purchase-journey";
import { InventoryStatus } from "@/components/inventory-status";

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

function deriveShoppingBrief(msgs: Msg[]): { category: string | null; budget: string | null; preferences: string[]; requirementCount: number } | null {
  const lastUser = [...msgs].reverse().find((m) => m.role === "user");
  if (!lastUser) return null;
  const text = lastUser.content.toLowerCase();

  let category: string | null = null;
  if (text.includes("headphone") || text.includes("headset") || text.includes("earphone")) category = "Headphones / Audio";
  else if (text.includes("keyboard") || text.includes("mouse") || text.includes("keychron") || text.includes("logitech mx")) category = "Keyboard / Peripherals";
  else if (text.includes("cable") || text.includes("charger") || text.includes("power") || text.includes("hub")) category = "Accessories";
  else if (text.includes("speaker") || text.includes("bluetooth speaker")) category = "Speaker";
  else if (text.includes("storage") || text.includes("ssd") || text.includes("drive") || text.includes("t7")) category = "Storage";
  else if (text.includes("sleeve") || text.includes("case") || text.includes("bag")) category = "Protection";
  else if (text.includes("webcam") || text.includes("camera") || text.includes("brio")) category = "Video";

  if (!category) return null;

  let budget: string | null = null;
  const priceMatch = text.match(/(?:under|below|max|budget)\s*[\u20b9$₹]*(\d[\d,]*)/);
  if (priceMatch) budget = `≤ ₹${priceMatch[1]}`;

  const preferences: string[] = [];
  if (text.includes("wireless") || text.includes("bluetooth")) preferences.push("Wireless");
  if (text.includes("wired") || text.includes("usb-c")) preferences.push("Wired");
  if (text.includes("travel") || text.includes("portable")) preferences.push("Portable");
  if (text.includes("gaming")) preferences.push("Gaming");

  const requirementCount = (category ? 1 : 0) + (budget ? 1 : 0) + preferences.length;
  if (requirementCount < 1) return null;

  return { category, budget, preferences, requirementCount };
}

function deriveCommandActions(msgs: Msg[], hasRecommendation: boolean, hasOrder: boolean): string[] {
  if (hasOrder) return ["Find a complement", "Continue shopping"];
  if (hasRecommendation) return ["Compare alternatives", "Why this one?", "Find cheaper", "Check availability"];
  if (msgs.length > 0) return ["Compare products", "Check availability", "Find recommendations"];
  return ["Find headphones", "Compare products", "Check availability", "Find a complement"];
}

function deriveShortlist(text: string, catalog: CatalogProduct[]): CatalogProduct[] {
  const lower = text.toLowerCase();
  const found = catalog.filter((p) => lower.includes(p.slug.toLowerCase()) || lower.includes(p.name.toLowerCase()));
  return found.slice(0, 3);
}

// ── Advanced Comparison Table ──
function ComparisonTable({ products, onBuy, onView }: { products: CatalogProduct[]; onBuy: (s: string) => void; onView: (p: CatalogProduct, r?: string) => void }) {
  const a = products[0];
  const b = products[1];
  if (!a || !b) return null;

  const allSpecKeys = new Set<string>();
  [a, b].forEach((p) => {
    if (p.attributes?.specs) Object.keys(p.attributes.specs).forEach((k) => allSpecKeys.add(k));
  });

  const isDiff = (va: string, vb: string) => va !== vb && va !== "—" && vb !== "—";

  const rows: { label: string; a: string; b: string }[] = [
    { label: "PRICE", a: formatPaise(a.price), b: formatPaise(b.price) },
    { label: "AVAILABILITY", a: a.stock > 0 ? `● In stock (${a.stock})` : "○ Out of stock", b: b.stock > 0 ? `● In stock (${b.stock})` : "○ Out of stock" },
  ];
  if (a.attributes?.connectivity || b.attributes?.connectivity) {
    rows.push({ label: "CONNECTIVITY", a: a.attributes?.connectivity || "Not available", b: b.attributes?.connectivity || "Not available" });
  }
  if (a.attributes?.brand || b.attributes?.brand) {
    rows.push({ label: "BRAND", a: a.attributes?.brand || "Not available", b: b.attributes?.brand || "Not available" });
  }
  for (const k of allSpecKeys) {
    rows.push({
      label: k.toUpperCase(),
      a: a.attributes?.specs?.[k] != null ? String(a.attributes.specs[k]) : "Not available",
      b: b.attributes?.specs?.[k] != null ? String(b.attributes.specs[k]) : "Not available",
    });
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden hover-glow">
      <div className="border-b border-zinc-800 px-4 py-2.5">
        <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase">Product Comparison</p>
      </div>
      <div className="grid grid-cols-3 border-b border-zinc-800 text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
        <div className="px-3 py-2" />
        <div className="px-3 py-2 text-zinc-300 truncate">{a.attributes?.brand || a.name.split(" ")[0]}</div>
        <div className="px-3 py-2 text-zinc-300 truncate">{b.attributes?.brand || b.name.split(" ")[0]}</div>
      </div>
      {rows.map((r, i) => {
        const diff = isDiff(r.a, r.b);
        return (
          <div key={r.label} className={`grid grid-cols-3 text-[11px] ${i < rows.length - 1 ? "border-b border-zinc-800/50" : ""} ${diff ? "bg-zinc-800/20" : ""}`}>
            <div className="px-3 py-2 text-zinc-500 font-medium">{r.label}</div>
            <div className={`px-3 py-2 ${diff ? "text-zinc-100 font-medium" : "text-zinc-400"}`}>{r.a}</div>
            <div className={`px-3 py-2 ${diff ? "text-zinc-100 font-medium" : "text-zinc-400"}`}>{r.b}</div>
          </div>
        );
      })}
      <div className="flex border-t border-zinc-800">
        <button onClick={() => onView(a)} className="flex-1 py-2 text-[11px] font-medium text-zinc-400 hover:bg-zinc-800 transition-colors border-r border-zinc-800">
          View
        </button>
        <button onClick={() => onBuy(a.slug)} className="flex-1 py-2 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 transition-colors border-r border-zinc-800">
          Buy {a.attributes?.brand || a.name.split(" ")[0]}
        </button>
        <button onClick={() => onView(b)} className="flex-1 py-2 text-[11px] font-medium text-zinc-400 hover:bg-zinc-800 transition-colors border-r border-zinc-800">
          View
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

  const [quickView, setQuickView] = useState<{ product: CatalogProduct; reasoning?: string } | null>(null);

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

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
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

  function handleQuickView(product: CatalogProduct, reasoning?: string) {
    setQuickView({ product, reasoning });
  }

  const shoppingBrief = deriveShoppingBrief(msgs);
  const hasRecommendation = msgs.some((m) => m.role === "assistant" && /price|₹|\bstock\b/i.test(m.content));
  const commandActions = deriveCommandActions(msgs, hasRecommendation, !!orderId);

  const lastAssistantWithProducts = [...msgs].reverse().find((m) => {
    if (m.role !== "assistant") return false;
    return findProductsInText(m.content).length >= 2;
  });
  const shortlistProducts = lastAssistantWithProducts ? deriveShortlist(lastAssistantWithProducts.content, catalog) : [];

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
        <div className="hidden lg:flex">
          <LeftNav activePage="shop" />
        </div>

        {/* Center */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-6">

              {/* ═══════ RICH EMPTY STATE ═══════ */}
              {msgs.length === 0 && !loading && (
                <div className="py-8 animate-in fade-in">
                  <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-zinc-800/80 mb-4 hover-lift">
                      <span className="text-2xl font-bold text-zinc-300">✦</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">ElectroCore</h1>
                    <p className="mt-1 text-[11px] font-semibold tracking-[0.25em] text-zinc-500 uppercase">AI Commerce Assistant</p>
                    <p className="mt-3 text-sm leading-6 text-zinc-400 max-w-md mx-auto">
                      Discover products. Compare options. Make smarter purchases.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 mb-8">
                    {[
                      { label: "Find a product", query: "I need wireless headphones under ₹30,000", icon: "→" },
                      { label: "Compare products", query: "Compare Sony WH-1000XM5 and JBL Flip 6", icon: "⇄" },
                      { label: "Check availability", query: "Is the Logitech MX Master 3S in stock?", icon: "◉" },
                      { label: "Find a complement", query: "What goes well with the Sony WH-1000XM5?", icon: "+" },
                    ].map((card) => (
                      <button
                        key={card.label}
                        onClick={() => send(card.query)}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-left hover:border-zinc-700 hover:bg-zinc-800/60 transition-all group hover-lift"
                      >
                        <span className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase group-hover:text-zinc-400">{card.icon} {card.label}</span>
                        <p className="mt-2 text-[11px] leading-4.5 text-zinc-500 group-hover:text-zinc-400 line-clamp-2">&quot;{card.query}&quot;</p>
                      </button>
                    ))}
                  </div>

                  <div className="text-center">
                    <p className="text-[11px] text-zinc-600">Try: &quot;I need wireless headphones under ₹30,000&quot;</p>
                  </div>
                </div>
              )}

              {/* ═══════ SHOPPING BRIEF ═══════ */}
              {shoppingBrief && msgs.length > 0 && (
                <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 animate-in fade-in">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] text-zinc-500">✦</span>
                    <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase">Shopping Brief</p>
                  </div>
                  <p className="text-sm font-medium text-zinc-200 mb-2">{shoppingBrief.category}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                    {shoppingBrief.budget && (
                      <span className="text-zinc-500"><span className="text-zinc-400 font-medium">BUDGET</span> {shoppingBrief.budget}</span>
                    )}
                    {shoppingBrief.preferences.map((p) => (
                      <span key={p} className="text-zinc-500"><span className="text-zinc-400 font-medium">PREF</span> {p.toUpperCase()}</span>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] text-zinc-600">{shoppingBrief.requirementCount} requirements identified</p>
                </div>
              )}

              {/* ═══════ MESSAGES ═══════ */}
              {msgs.map((m, i) => {
                const isAssistant = m.role === "assistant";
                const found = isAssistant && catalog.length ? findProductsInText(m.content) : [];
                const showComparison = isAssistant && isComparison(m.content, found) && found.length >= 2;
                const showCard = isAssistant && found.length === 1 && !showComparison;
                const aiVerdict = isAssistant ? m.content.split("\n").filter((l) => /verdict|recommend|best fit|overall|summary/i.test(l)).slice(0, 2).join(" ") : "";

                const whyNotItems: { name: string; reason: string }[] = [];
                if (isAssistant && found.length >= 2) {
                  for (let j = 1; j < Math.min(found.length, 3); j++) {
                    const p = found[j];
                    const priceOverBudget = shoppingBrief?.budget ? p.price > parseInt(shoppingBrief.budget.replace(/[≤₹,\s]/g, "")) * 100 : false;
                    const reason = priceOverBudget ? "Above requested budget" : "Does not match all stated requirements";
                    whyNotItems.push({ name: p.name, reason });
                  }
                }

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

                        {/* Single product recommendation */}
                        {showCard && found[0] && (
                          <div className="ml-7 max-w-md space-y-2.5">
                            {/* Why This Product */}
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden hover-glow">
                              <div className="border-b border-zinc-800 px-3.5 py-2">
                                <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase">✦ Why This Product</p>
                              </div>
                              <div className="p-3.5 space-y-3">
                                {shoppingBrief && (
                                  <div>
                                    <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-1.5">Your Requirements</p>
                                    <div className="space-y-0.5">
                                      {shoppingBrief.budget && <p className="text-[11px] text-zinc-400">✓ {shoppingBrief.budget}</p>}
                                      {shoppingBrief.preferences.map((p) => (
                                        <p key={p} className="text-[11px] text-zinc-400">✓ {p}</p>
                                      ))}
                                      <p className="text-[11px] text-zinc-400">✓ Currently available</p>
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-1.5">Catalog Evidence</p>
                                  <div className="space-y-0.5">
                                    <p className="text-[11px] text-zinc-400">{formatPaise(found[0].price)}</p>
                                    <InventoryStatus stock={found[0].stock} status={found[0].status} />
                                    {found[0].attributes?.connectivity && <p className="text-[11px] text-zinc-400">{found[0].attributes.connectivity}</p>}
                                    {found[0].attributes?.brand && <p className="text-[11px] text-zinc-400">{found[0].attributes.brand}</p>}
                                  </div>
                                </div>
                                {aiVerdict && (
                                  <>
                                    <div className="h-px bg-zinc-800" />
                                    <div>
                                      <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-1">AI Verdict</p>
                                      <p className="text-[11px] leading-4.5 text-zinc-400">{aiVerdict}</p>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            <ProductCard
                              product={found[0]}
                              variant="ai-pick"
                              onCompare={() => handleCompare(found[0].slug, catalog.find((p) => p.slug !== found[0].slug)?.slug || "jbl-flip-6")}
                              onBuy={() => handleBuy(found[0].slug)}
                            />

                            <button
                              onClick={() => handleQuickView(found[0], aiVerdict || undefined)}
                              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-[11px] font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                            >
                              View details →
                            </button>
                          </div>
                        )}

                        {/* Comparison */}
                        {showComparison && (
                          <div className="ml-7 max-w-lg space-y-2.5">
                            <ComparisonTable products={found.slice(0, 2)} onBuy={handleBuy} onView={(p, r) => handleQuickView(p, r)} />
                            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5">
                              <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-1">AI Verdict</p>
                              <p className="text-[11px] leading-4.5 text-zinc-400">Grounded comparison — facts from catalog, reasoning from your request.</p>
                            </div>
                          </div>
                        )}

                        {/* Shortlist */}
                        {!showComparison && shortlistProducts.length >= 2 && i === msgs.length - 1 && (
                          <div className="ml-7 space-y-2.5">
                            <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase">✦ AI Shortlist</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {shortlistProducts.map((p, idx) => (
                                <div key={p.slug} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 space-y-1.5 hover-lift">
                                  <p className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
                                    {idx === 0 ? "Best Match" : idx === 1 ? "Alternative" : "Option 03"}
                                  </p>
                                  <p className="text-[11px] font-medium text-zinc-200 line-clamp-1">{p.name}</p>
                                  <p className="text-[11px] text-zinc-400">{formatPaise(p.price)}</p>
                                  <InventoryStatus stock={p.stock} status={p.status} />
                                  <button
                                    onClick={() => handleQuickView(p)}
                                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
                                  >
                                    View
                                  </button>
                                </div>
                              ))}
                            </div>

                            {whyNotItems.length > 0 && (
                              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5">
                                <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-1.5">AI Evaluation</p>
                                <p className="text-[10px] text-zinc-600 mb-1.5">{found.length} options considered</p>
                                <div className="space-y-1">
                                  <p className="text-[11px] text-emerald-400">✓ {found[0].name}</p>
                                  {whyNotItems.map((item) => (
                                    <p key={item.name} className="text-[11px] text-zinc-500">○ {item.name} — {item.reason}</p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && <AIProcessing />}

              {/* ═══════ PURCHASE REVIEW + JOURNEY ═══════ */}
              {intent && !orderId && (
                <div id="purchase-panel" className="mt-4 animate-in fade-in space-y-3">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden hover-glow">
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
                  <PurchaseJourney audit={audit} intent={intent} orderId={orderId} purchaseLoading={purchaseLoading} />
                </div>
              )}

              {/* ═══════ ORDER RECEIPT ═══════ */}
              {orderId && (
                <div className="mt-4 animate-in animate-success">
                  <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 overflow-hidden hover-glow">
                    <div className="p-6 text-center space-y-3">
                      <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-xl text-emerald-500">✓</span>
                      </div>
                      <h2 className="text-lg font-bold text-emerald-200 tracking-tight">ORDER CONFIRMED</h2>
                      <p className="text-sm text-emerald-300">{intent?.product.name}</p>
                      <p className="text-sm font-bold text-emerald-200">{intent ? formatPaise(intent.total) : ""}</p>
                    </div>
                    <div className="border-t border-emerald-900/30 px-6 py-4 space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold tracking-[0.15em] text-emerald-400/60 uppercase mb-1">Order ID</p>
                        <p className="text-[11px] font-mono text-emerald-400/80 break-all">{orderId}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 text-emerald-400/80">
                          <span className="text-emerald-500">✓</span> Payment verified
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-400/80">
                          <span className="text-emerald-500">✓</span> Inventory updated
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════ POST-PURCHASE DISCOVERY ═══════ */}
              {orderId && (
                <div className="mt-4 animate-in fade-in">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover-glow">
                    <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-3">✦ AI Discovery</p>
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
                      <div className="space-y-3">
                        <p className="text-[11px] text-zinc-400">You might also like</p>
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
                        {postRec.reason && (
                          <div className="rounded-lg bg-zinc-950 px-3 py-2">
                            <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-1">Why this product</p>
                            <p className="text-[11px] leading-4.5 text-zinc-400">{postRec.reason}</p>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-emerald-900/50 bg-emerald-950/40 px-3 py-1 text-[11px] text-emerald-300">✓ Compatible</span>
                          <span className="rounded-full border border-emerald-900/50 bg-emerald-950/40 px-3 py-1 text-[11px] text-emerald-300">✓ In stock</span>
                          <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-[11px] text-zinc-400">Relevant category</span>
                        </div>
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

          {/* ═══════ PURCHASE BAR ═══════ */}
          <div className="border-t border-zinc-800 bg-zinc-950/80 shrink-0">
            <div className="mx-auto w-full max-w-3xl px-4 py-2 lg:px-6">
              <div id="purchase-panel" className="flex items-center gap-2">
                <select
                  value={productSlug}
                  onChange={(e) => setProductSlug(e.target.value)}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[11px] text-zinc-300 focus:border-zinc-600 focus:outline-none transition-colors"
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

          {/* ═══════ AI COMMAND BAR ═══════ */}
          <div className="border-t border-zinc-800 bg-zinc-950 shrink-0">
            <div className="mx-auto w-full max-w-3xl px-4 pt-3 pb-3 lg:px-6">
              {error && (
                <p className="mb-2 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-1.5 text-[11px] text-red-300">{error}</p>
              )}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600">✦</span>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Ask ElectroCore anything..."
                    maxLength={500}
                    disabled={loading}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-7 pr-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 disabled:opacity-50 transition-colors"
                    aria-label="Ask shopping assistant"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-700 hidden sm:inline">⌘ ↵</span>
                </div>
                <button
                  onClick={() => send()}
                  disabled={loading || input.trim().length === 0}
                  className="rounded-xl bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-zinc-300 transition-colors"
                  aria-label="Send message"
                >
                  Send →
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {commandActions.map((action) => (
                  <button
                    key={action}
                    onClick={() => send(action)}
                    className="rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-[10px] text-zinc-500 hover:border-zinc-700 hover:text-zinc-300 transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-zinc-700">Catalog grounded · Razorpay test mode · No invented products or prices</p>
            </div>
          </div>
        </div>

        {/* Right Context Panel */}
        <div className="hidden lg:flex">
          <ContextPanel msgs={msgs} intent={intent} orderId={orderId} postRec={postRec} catalogCount={catalog.length} purchaseLoading={purchaseLoading} />
        </div>
      </div>

      {/* Quick View Modal */}
      {quickView && (
        <ProductQuickView
          product={quickView.product}
          aiReasoning={quickView.reasoning}
          onClose={() => setQuickView(null)}
          onCompare={
            catalog.length > 1
              ? () => {
                  const other = catalog.find((p) => p.slug !== quickView.product.slug);
                  if (other) handleCompare(quickView.product.slug, other.slug);
                  setQuickView(null);
                }
              : undefined
          }
          onBuy={() => {
            handleBuy(quickView.product.slug);
            setQuickView(null);
          }}
        />
      )}
    </div>
  );
}
