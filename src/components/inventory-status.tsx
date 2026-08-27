export function InventoryStatus({
  stock,
  status,
  variant = "inline",
}: {
  stock: number;
  status: string;
  variant?: "inline" | "detailed";
}) {
  const inStock = stock > 0 && status !== "ARCHIVED" && status !== "DRAFT";

  if (variant === "inline") {
    return (
      <p className="flex items-center gap-1.5 text-[11px]">
        <span className={`h-1.5 w-1.5 rounded-full ${inStock ? "bg-emerald-500" : "bg-red-500"}`} aria-hidden />
        <span className={inStock ? "text-zinc-400" : "text-red-300"}>
          {inStock ? `In stock · ${stock} units` : "Out of stock"}
        </span>
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="border-b border-zinc-800 px-3.5 py-2">
        <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase">Availability</p>
      </div>
      <div className="p-3.5">
        {inStock ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">In Stock</span>
            </div>
            <p className="text-[11px] text-zinc-400">{stock} units available</p>
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500/60 transition-all duration-500"
                style={{ width: `${Math.min(100, (stock / 20) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-zinc-500">Available for purchase</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-[11px] font-medium text-red-400 uppercase tracking-wider">Out of Stock</span>
            </div>
            <p className="text-[11px] text-zinc-400">No units currently available</p>
            <p className="text-[10px] text-zinc-500">AI can look for alternatives</p>
          </div>
        )}
      </div>
    </div>
  );
}
