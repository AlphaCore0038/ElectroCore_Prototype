"use client";

import { formatPaise } from "@/lib/format";

type Product = {
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

export function ComparisonTable({
  products,
  onBuy,
  onView,
}: {
  products: Product[];
  onBuy?: (slug: string) => void;
  onView?: (p: Product) => void;
}) {
  const a = products[0];
  const b = products[1];
  if (!a || !b) return null;

  const allSpecKeys = new Set<string>();
  [a, b].forEach((p) => {
    if (p.attributes?.specs) Object.keys(p.attributes.specs).forEach((k) => allSpecKeys.add(k));
  });

  const isDiff = (va: string, vb: string) => va !== vb && va !== "Not available" && vb !== "Not available";

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
      {(onBuy || onView) && (
        <div className="flex border-t border-zinc-800">
          {onView && <button onClick={() => onView(a)} className="flex-1 py-2 text-[11px] font-medium text-zinc-400 hover:bg-zinc-800 transition-colors border-r border-zinc-800">View A</button>}
          {onBuy && <button onClick={() => onBuy(a.slug)} className="flex-1 py-2 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 transition-colors border-r border-zinc-800">Buy {a.attributes?.brand || a.name.split(" ")[0]}</button>}
          {onView && <button onClick={() => onView(b)} className="flex-1 py-2 text-[11px] font-medium text-zinc-400 hover:bg-zinc-800 transition-colors border-r border-zinc-800">View B</button>}
          {onBuy && <button onClick={() => onBuy(b.slug)} className="flex-1 py-2 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 transition-colors">Buy {b.attributes?.brand || b.name.split(" ")[0]}</button>}
        </div>
      )}
    </div>
  );
}
