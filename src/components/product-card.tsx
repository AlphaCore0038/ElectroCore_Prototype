type ProductCardProduct = {
  slug: string;
  name: string;
  price: number;
  currency: string;
  stock?: number;
  status?: string;
  description?: string;
  attributes?: {
    brand?: string;
    model?: string;
    color?: string;
    connectivity?: string;
    warrantyMonths?: number;
    specs?: Record<string, string | number>;
    compatibleWith?: string[];
  } | null;
  imageUrl?: string | null;
};

function formatPaise(p: number) {
  return `₹${(p / 100).toFixed(2).replace(/\.00$/, "")}`;
}

export function ProductCard({
  product,
  variant = "default",
  onCompare,
  onBuy,
}: {
  product: ProductCardProduct;
  variant?: "ai-pick" | "complement" | "default";
  onCompare?: () => void;
  onBuy?: () => void;
}) {
  const inStock = (product.stock ?? 1) > 0 && product.status !== "ARCHIVED" && product.status !== "DRAFT";
  // status check uses stock, default to in stock if unknown
  const brandInitial = (product.attributes?.brand || product.name).charAt(0).toUpperCase();
  const specs = product.attributes?.specs;
  const connectivity = product.attributes?.connectivity;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden animate-in fade-in">
      <div className="aspect-[16/9] bg-zinc-950 flex items-center justify-center border-b border-zinc-800 relative overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-4xl font-semibold tracking-tight text-zinc-800 select-none">{brandInitial}</span>
        )}
        {variant === "ai-pick" && (
          <span className="absolute left-3 top-3 rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold tracking-widest text-zinc-900">AI PICK</span>
        )}
        {variant === "complement" && (
          <span className="absolute left-3 top-3 rounded-full bg-zinc-800 px-2.5 py-1 text-[10px] font-semibold tracking-widest text-zinc-300 border border-zinc-700">COMPLEMENTS</span>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-100 line-clamp-2">{product.name}</h3>
        <p className="mt-1 text-sm font-medium text-zinc-100">{formatPaise(product.price)}</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs">
          <span className={`h-1.5 w-1.5 rounded-full ${inStock ? "bg-emerald-500" : "bg-red-500"}`} aria-hidden />
          <span className={inStock ? "text-zinc-400" : "text-red-300"}>{inStock ? "In stock" : "Out of stock"}</span>
          {product.attributes?.brand && <span className="text-zinc-600">· {product.attributes.brand}</span>}
        </p>
        {product.description && <p className="mt-2 text-xs leading-5 text-zinc-500 line-clamp-2">{product.description}</p>}
        {(connectivity || specs) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {connectivity && <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-400">{connectivity}</span>}
            {specs &&
              Object.entries(specs)
                .slice(0, 3)
                .map(([k, v]) => (
                  <span key={k} className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-400">
                    {k}: {String(v)}
                  </span>
                ))}
          </div>
        )}
        {(onCompare || onBuy) && (
          <div className="mt-4 flex gap-2">
            {onCompare && (
              <button onClick={onCompare} className="flex-1 rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-700">
                Compare
              </button>
            )}
            {onBuy && (
              <button onClick={onBuy} className="flex-1 rounded-full bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-900 hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300">
                Buy
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
