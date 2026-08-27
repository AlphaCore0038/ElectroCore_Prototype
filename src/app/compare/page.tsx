"use client";

import { useEffect, useState, useRef } from "react";
import { ComparisonTable } from "@/components/comparison-table";
import { TopBar } from "@/components/top-bar";
import { LeftNav } from "@/components/left-nav";

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

export default function ComparePage() {
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [slugA, setSlugA] = useState("");
  const [slugB, setSlugB] = useState("");
  const [productA, setProductA] = useState<CatalogProduct | null>(null);
  const [productB, setProductB] = useState<CatalogProduct | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const fetchARef = useRef(0);
  const fetchBRef = useRef(0);

  useEffect(() => {
    fetch("/api/catalog/search?limit=20")
      .then((r) => r.json())
      .then((j: { products?: CatalogProduct[] }) => { if (j.products) { setCatalog(j.products); if (j.products.length >= 2) { setSlugA(j.products[0].slug); setSlugB(j.products[1].slug); } } })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = ++fetchARef.current;
    if (!slugA) return;
    fetch(`/api/catalog/products/${slugA}`)
      .then((r) => r.json())
      .then((j) => { if (id === fetchARef.current) setProductA(j); })
      .catch(() => {});
  }, [slugA]);

  useEffect(() => {
    const id = ++fetchBRef.current;
    if (!slugB) return;
    fetch(`/api/catalog/products/${slugB}`)
      .then((r) => r.json())
      .then((j) => { if (id === fetchBRef.current) setProductB(j); })
      .catch(() => {});
  }, [slugB]);

  const canCompare = productA && productB && slugA !== slugB;

  return (
    <div className="flex h-dvh flex-col bg-zinc-950 text-zinc-100">
      <TopBar mobileNavOpen={mobileNav} onToggleNav={() => setMobileNav(!mobileNav)} />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:flex"><LeftNav /></div>
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-6">
              <div className="mb-6">
                <h1 className="text-xl font-bold tracking-tight">Compare</h1>
                <p className="mt-1 text-[11px] text-zinc-500">Side-by-side product comparison</p>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase">Product A</label>
                  <select value={slugA} onChange={(e) => setSlugA(e.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none">
                    {catalog.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase">Product B</label>
                  <select value={slugB} onChange={(e) => setSlugB(e.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none">
                    {catalog.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              {slugA === slugB && slugA && (
                <p className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-[11px] text-zinc-400">Select two different products to compare.</p>
              )}

              {canCompare && productA && productB && (
                <ComparisonTable products={[productA, productB]} />
              )}

              {!canCompare && !slugA && (
                <div className="py-12 text-center">
                  <p className="text-sm text-zinc-400">Select two products to compare</p>
                  <p className="mt-1 text-[11px] text-zinc-600">Choose products from the dropdowns above</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
