"use client";

import { useEffect, useRef } from "react";

type QuickViewProduct = {
  slug: string;
  name: string;
  price: number;
  currency: string;
  stock: number;
  status: string;
  description: string;
  attributes: {
    brand?: string;
    connectivity?: string;
    specs?: Record<string, string | number>;
    compatibleWith?: string[];
  } | null;
  imageUrl: string | null;
};

function formatPaise(p: number) {
  return `₹${(p / 100).toFixed(2).replace(/\.00$/, "")}`;
}

export function ProductQuickView({
  product,
  aiReasoning,
  onClose,
  onCompare,
  onBuy,
}: {
  product: QuickViewProduct;
  aiReasoning?: string;
  onClose: () => void;
  onCompare?: () => void;
  onBuy?: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const inStock = (product.stock ?? 0) > 0 && product.status !== "ARCHIVED" && product.status !== "DRAFT";
  const brandInitial = (product.attributes?.brand || product.name).charAt(0).toUpperCase();
  const specs = product.attributes?.specs;
  const connectivity = product.attributes?.connectivity;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Quick view: ${product.name}`}
    >
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl animate-in fade-in slide-in-from-bottom duration-200">
        {/* Close */}
        <button
          ref={closeRef}
          onClick={onClose}
          className="absolute right-3 top-3 z-10 h-7 w-7 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 flex items-center justify-center text-xs transition-colors"
          aria-label="Close quick view"
        >
          ×
        </button>

        {/* Product image / placeholder */}
        <div className="aspect-[16/9] bg-zinc-950 flex items-center justify-center border-b border-zinc-800 relative">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-5xl font-bold tracking-tight text-zinc-800 select-none">{brandInitial}</span>
              {product.attributes?.brand && (
                <span className="text-[10px] tracking-[0.25em] text-zinc-700 uppercase">{product.attributes.brand}</span>
              )}
            </div>
          )}
          <div className="absolute left-3 top-3">
            <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium ${inStock ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${inStock ? "bg-emerald-500" : "bg-red-500"}`} />
              {inStock ? `In stock · ${product.stock} units` : "Out of stock"}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Identity */}
          <div>
            <h2 className="text-lg font-bold tracking-tight text-zinc-100">{product.name}</h2>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold text-zinc-100">{formatPaise(product.price)}</span>
              <span className="text-[11px] text-zinc-500 uppercase">{product.currency || "INR"}</span>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-sm leading-6 text-zinc-400">{product.description}</p>
          )}

          {/* Attributes */}
          {(connectivity || specs) && (
            <div>
              <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-2">Attributes</p>
              <div className="flex flex-wrap gap-1.5">
                {connectivity && (
                  <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-[11px] text-zinc-400">{connectivity}</span>
                )}
                {specs && Object.entries(specs).map(([k, v]) => (
                  <span key={k} className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-[11px] text-zinc-400">
                    {k}: {String(v)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Compatible with */}
          {product.attributes?.compatibleWith && product.attributes.compatibleWith.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-2">Compatible with</p>
              <div className="flex flex-wrap gap-1.5">
                {product.attributes.compatibleWith.map((c) => (
                  <span key={c} className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-[11px] text-zinc-400">{c}</span>
                ))}
              </div>
            </div>
          )}

          {/* AI reasoning */}
          {aiReasoning && (
            <div>
              <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-2">Why ElectroCore recommends it</p>
              <p className="text-sm leading-6 text-zinc-300">{aiReasoning}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {onCompare && (
              <button
                onClick={onCompare}
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
              >
                Compare
              </button>
            )}
            {onBuy && (
              <button
                onClick={onBuy}
                className="flex-1 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white transition-colors"
              >
                Buy
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
