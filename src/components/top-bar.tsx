"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopBar({ mobileNavOpen, onToggleNav }: { mobileNavOpen: boolean; onToggleNav: () => void }) {
  const pathname = usePathname();
  const isMerchant = pathname.startsWith("/merchant");

  return (
    <>
      <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-2.5 lg:px-5 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onToggleNav} className="lg:hidden text-zinc-400 hover:text-zinc-200 p-1" aria-label="Toggle navigation">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-300">E</div>
            <span className="text-sm font-bold tracking-tight text-zinc-100 hidden sm:inline">ElectroCore</span>
          </div>
          <span className="text-[10px] font-semibold tracking-[0.2em] text-zinc-600 uppercase hidden sm:inline">AI Commerce</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-[10px] text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
            AI ASSISTANT
          </span>
          <Link
            href={isMerchant ? "/" : "/merchant"}
            className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors hidden sm:inline"
          >
            {isMerchant ? "AI Shopping" : "Merchant Advisor"}
          </Link>
        </div>
      </header>

      {mobileNavOpen && (
        <div className="lg:hidden border-b border-zinc-800 bg-zinc-950">
          <div className="px-4 py-3 space-y-1">
            <Link href="/" onClick={onToggleNav} className={`block rounded-lg px-3 py-2 text-sm ${!isMerchant ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900"}`}>AI Shopping</Link>
            <Link href="/merchant" onClick={onToggleNav} className={`block rounded-lg px-3 py-2 text-sm ${isMerchant ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900"}`}>Merchant Advisor</Link>
          </div>
        </div>
      )}
    </>
  );
}
