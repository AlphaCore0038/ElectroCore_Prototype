"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { ProductCard } from "@/components/product-card";
import { ProductQuickView } from "@/components/product-quick-view";
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

const CATEGORIES = ["All", "AUDIO", "PERIPHERALS", "POWER", "CABLES", "STORAGE", "ACCESSORIES"] as const;

export default function ProductsPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [inStock, setInStock] = useState(false);
  const [quickView, setQuickView] = useState<CatalogProduct | null>(null);
  const [isPending, startTransition] = useTransition();
  const fetchIdRef = useRef(0);

  useEffect(() => {
    const id = ++fetchIdRef.current;
    const params = new URLSearchParams({ limit: "20" });
    if (search) params.set("q", search);
    if (category !== "All") params.set("category", category);
    if (inStock) params.set("inStock", "true");
    startTransition(() => {
      fetch(`/api/catalog/search?${params}`)
        .then((r) => r.json())
        .then((j: { products?: CatalogProduct[] }) => { if (id === fetchIdRef.current && j.products) setProducts(j.products); })
        .catch(() => {});
    });
  }, [search, category, inStock, startTransition]);

  return (
    <div className="flex h-dvh flex-col bg-zinc-950 text-zinc-100">
      <TopBar mobileNavOpen={mobileNav} onToggleNav={() => setMobileNav(!mobileNav)} />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:flex"><LeftNav /></div>
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-6">
              <div className="mb-6">
                <h1 className="text-xl font-bold tracking-tight">Products</h1>
                <p className="mt-1 text-[11px] text-zinc-500">Browse the ElectroCore catalog</p>
              </div>

              <div className="mb-4 flex flex-col gap-3">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search catalog..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none transition-colors"
                />
                <div className="flex flex-wrap items-center gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      className={`rounded-full border px-3 py-1 text-[10px] font-medium transition-colors ${
                        category === c ? "border-zinc-600 bg-zinc-800 text-zinc-200" : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                      }`}
                    >
                      {c === "All" ? "All" : c.charAt(0) + c.slice(1).toLowerCase()}
                    </button>
                  ))}
                  <button
                    onClick={() => setInStock(!inStock)}
                    className={`rounded-full border px-3 py-1 text-[10px] font-medium transition-colors ${
                      inStock ? "border-emerald-800 bg-emerald-950/50 text-emerald-400" : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                    }`}
                  >
                    {inStock ? "● In Stock" : "○ All Stock"}
                  </button>
                </div>
              </div>

              <p className="mb-4 text-[10px] text-zinc-600">{products.length} products</p>

              {isPending ? (
                <div className="py-12 text-center text-sm text-zinc-500">Loading…</div>
              ) : products.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-zinc-400">No products found</p>
                  <p className="mt-1 text-[11px] text-zinc-600">Try a different search or filter</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {products.map((p) => (
                    <button key={p.slug} onClick={() => setQuickView(p)} className="text-left">
                      <ProductCard
                        product={p}
                        onBuy={() => {}}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {quickView && <ProductQuickView product={quickView} onClose={() => setQuickView(null)} />}
    </div>
  );
}
