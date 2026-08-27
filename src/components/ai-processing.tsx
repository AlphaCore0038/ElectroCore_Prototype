export function AIProcessing() {
  return (
    <div className="flex justify-start animate-in fade-in">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 min-w-[200px] max-w-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-0.5">
            <span className="h-1 w-1 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1 w-1 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1 w-1 rounded-full bg-zinc-500 animate-bounce" />
          </span>
          <span className="text-[11px] text-zinc-500">Analyzing your request</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-zinc-600">
          <span className="text-zinc-500">→</span>
          <span>searching catalog</span>
          <span className="text-zinc-700">·</span>
          <span>evaluating options</span>
          <span className="text-zinc-700">·</span>
          <span>reasoning</span>
        </div>
      </div>
    </div>
  );
}
