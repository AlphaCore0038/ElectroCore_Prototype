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
  const brandInitial = (product.attributes?.brand || product.name).charAt(0).toUpperCase();
  const specs = product.attributes?.specs;
  const connectivity = product.attributes?.connectivity;

  const isPick = variant === "ai-pick";

  return (
    <div
      className={`rounded-xl border overflow-hidden animate-in fade-in transition-colors ${
        isPick
          ? "border-zinc-700 bg-zinc-900 shadow-lg shadow-zinc-900/50"
          : "border-zinc-800 bg-zinc-900"
      }`}
    >
      <div className="relative aspect-[16/9] bg-zinc-950 flex items-center justify-center border-b border-zinc-800 overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span className={`text-3xl font-bold tracking-tight select-none ${isPick ? "text-zinc-700" : "text-zinc-800"}`}>
              {brandInitial}
            </span>
            {product.attributes?.brand && (
              <span className="text-[9px] tracking-[0.2em] text-zinc-700 uppercase">{product.attributes.brand}</span>
            )}
          </div>
        )}

        {isPick && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-bold tracking-widest text-zinc-900 shadow-sm">
            ✦ AI PICK
          </span>
        )}
        {variant === "complement" && (
          <span className="absolute left-2.5 top-2.5 rounded-full border border-zinc-700 bg-zinc-900/90 px-2.5 py-1 text-[10px] font-semibold tracking-widest text-zinc-300">
            COMPLEMENT
          </span>
        )}

        {isPick && (
          <div className="absolute right-2.5 top-2.5">
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              {inStock ? "Available" : "Unavailable"}
            </span>
          </div>
        )}
      </div>

      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-tight text-zinc-100 line-clamp-2">{product.name}</h3>
        </div>

        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-base font-bold text-zinc-100">{formatPaise(product.price)}</span>
          <span className="text-[10px] text-zinc-500 uppercase">{product.currency || "INR"}</span>
        </div>

        <p className="mt-1 flex items-center gap-1.5 text-[11px]">
          <span className={`h-1.5 w-1.5 rounded-full ${inStock ? "bg-emerald-500" : "bg-red-500"}`} aria-hidden />
          <span className={inStock ? "text-zinc-400" : "text-red-300"}>
            {inStock ? `In stock${product.stock ? ` · ${product.stock} units` : ""}` : "Out of stock"}
          </span>
          {product.attributes?.brand && <span className="text-zinc-600">· {product.attributes.brand}</span>}
        </p>

        {product.description && (
          <p className="mt-2 text-[11px] leading-4.5 text-zinc-500 line-clamp-2">{product.description}</p>
        )}

        {(connectivity || specs) && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {connectivity && (
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] text-zinc-400">{connectivity}</span>
            )}
            {specs &&
              Object.entries(specs)
                .slice(0, 3)
                .map(([k, v]) => (
                  <span key={k} className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] text-zinc-400">
                    {k}: {String(v)}
                  </span>
                ))}
          </div>
        )}

        {(onCompare || onBuy) && (
          <div className="mt-3 flex gap-2">
            {onCompare && (
              <button
                onClick={onCompare}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-colors"
              >
                Compare
              </button>
            )}
            {onBuy && (
              <button
                onClick={onBuy}
                className={`flex-1 rounded-lg px-3 py-1.5 text-[11px] font-medium focus:outline-none focus:ring-1 transition-colors ${
                  isPick
                    ? "bg-zinc-100 text-zinc-900 hover:bg-white focus:ring-zinc-300"
                    : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 focus:ring-zinc-600"
                }`}
              >
                Buy
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
