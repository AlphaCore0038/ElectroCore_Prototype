"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/top-bar";
import { LeftNav } from "@/components/left-nav";

type OrderItem = { name: string; slug: string; unitPrice: number; quantity: number; total: number };
type Order = {
  id: string;
  total: number;
  currency: string;
  status: string;
  createdAt: string;
  items: OrderItem[];
  payment: { status: string; verifiedAt: string | null } | null;
  intentId: string;
};

type AuditEvent = { type: string; reason?: string; createdAt: string };

function formatPaise(p: number) {
  return `₹${(p / 100).toFixed(2).replace(/\.00$/, "")}`;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [audit, setAudit] = useState<Record<string, AuditEvent[]>>({});

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((j: { data?: Order[] }) => { if (j.data) setOrders(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggleAudit(order: Order) {
    if (expandedOrder === order.id) { setExpandedOrder(null); return; }
    setExpandedOrder(order.id);
    if (!audit[order.id]) {
      try {
        const r = await fetch(`/api/audit?intentId=${order.intentId}`);
        const j = (await r.json()) as { data?: { events: AuditEvent[] } };
        if (j.data?.events) setAudit((prev) => ({ ...prev, [order.id]: j.data!.events }));
      } catch {}
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-zinc-950 text-zinc-100">
      <TopBar mobileNavOpen={mobileNav} onToggleNav={() => setMobileNav(!mobileNav)} />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:flex"><LeftNav /></div>
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-6">
              <div className="mb-6">
                <h1 className="text-xl font-bold tracking-tight">Orders</h1>
                <p className="mt-1 text-[11px] text-zinc-500">Your purchase history</p>
              </div>

              {loading ? (
                <div className="py-12 text-center text-sm text-zinc-500">Loading…</div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-zinc-800/80 mb-4">
                    <span className="text-2xl font-bold text-zinc-300">▤</span>
                  </div>
                  <p className="text-sm text-zinc-400">No orders yet</p>
                  <p className="mt-1 text-[11px] text-zinc-600">Complete a purchase to see your order history.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((o) => (
                    <div key={o.id} className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden hover-glow">
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">✓ {o.status}</span>
                        </div>
                        {o.items.map((i) => (
                          <div key={i.slug} className="mb-1">
                            <p className="text-sm font-semibold text-zinc-100">{i.name}</p>
                            <p className="text-[11px] text-zinc-400">{i.quantity} × {formatPaise(i.unitPrice)}</p>
                          </div>
                        ))}
                        <p className="text-base font-bold text-zinc-100 mt-1">{formatPaise(o.total)}</p>
                        <p className="text-[10px] text-zinc-600 mt-1 font-mono">Order {o.id.slice(0, 12)}…</p>
                        <p className="text-[10px] text-zinc-600">{new Date(o.createdAt).toLocaleDateString()}</p>
                        <button onClick={() => toggleAudit(o)} className="mt-2 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
                          {expandedOrder === o.id ? "Hide purchase journey ↑" : "View purchase journey →"}
                        </button>
                      </div>

                      {expandedOrder === o.id && audit[o.id] && (
                        <div className="border-t border-zinc-800 p-4 animate-in fade-in">
                          <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-3">Purchase Journey</p>
                          <div className="space-y-2">
                            {audit[o.id].map((a, i) => (
                              <div key={i} className="flex items-start gap-3">
                                <span className={`text-[11px] mt-0.5 ${a.type.includes("FAILED") ? "text-red-500" : "text-emerald-500"}`}>
                                  {a.type.includes("FAILED") ? "✕" : "✓"}
                                </span>
                                <div>
                                  <p className="text-[11px] text-zinc-300">{a.type.replace(/_/g, " ")}</p>
                                  {a.reason && <p className="text-[10px] text-zinc-500">{a.reason}</p>}
                                  <p className="text-[9px] text-zinc-600 font-mono">{new Date(a.createdAt).toLocaleTimeString()}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
