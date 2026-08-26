export function AIProcessing() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3.5 min-w-[220px]">
        <p className="text-xs font-medium tracking-widest text-zinc-500 uppercase">Preparing your recommendation</p>
        <div className="mt-2 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-bounce" />
          <span className="ml-2 text-xs text-zinc-500">understanding → discovering → evaluating</span>
        </div>
      </div>
    </div>
  );
}
