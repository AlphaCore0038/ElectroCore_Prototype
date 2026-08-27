"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

type Conversation = {
  id: string;
  title: string | null;
  updatedAt: string;
};

function deriveTitle(title: string | null, id: string) {
  if (title && title.length > 0) return title.length > 28 ? title.slice(0, 28) + "…" : title;
  return id.slice(0, 12) + "…";
}

export function LeftNav({
  conversationId,
  onConversationDeleted,
}: {
  conversationId?: string | null;
  onConversationDeleted?: (deletedId: string) => void;
}) {
  const pathname = usePathname();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/conversations?limit=10")
      .then((r) => r.json())
      .then((j: { data?: Conversation[] }) => {
        if (j.data) setConversations(j.data);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (deleting) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        onConversationDeleted?.(id);
      }
    } catch {}
    setDeleting(null);
  }

  async function handleClearAll() {
    setShowClearConfirm(false);
    try {
      const res = await fetch("/api/conversations", { method: "DELETE" });
      if (res.ok) {
        setConversations([]);
        if (conversationId) onConversationDeleted?.(conversationId);
      }
    } catch {}
  }

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const navItems = [
    { group: "Shop", items: [
      { href: "/", icon: "✦", label: "AI Shopping" },
      { href: "/compare", icon: "⬡", label: "Compare" },
      { href: "/products", icon: "◻", label: "Products" },
    ]},
    { group: "Purchase", items: [
      { href: "/orders", icon: "▤", label: "Orders" },
    ]},
    { group: "AI", items: [
      { href: "/recommendations", icon: "◎", label: "Recommendations" },
      { href: "/merchant", icon: "⟡", label: "Merchant Advisor" },
    ]},
  ];

  return (
    <nav className="flex h-full w-52 flex-col border-r border-zinc-800 bg-zinc-950 px-3 py-4 text-xs overflow-y-auto" aria-label="Main navigation">
      <div className="mb-6 px-2">
        <p className="text-sm font-bold tracking-tight text-zinc-100">ElectroCore</p>
        <p className="mt-0.5 text-[10px] font-medium tracking-[0.2em] text-zinc-500 uppercase">AI Commerce</p>
      </div>

      {navItems.map((section) => (
        <div key={section.group} className="mb-4">
          <p className="mb-1.5 px-2 text-[10px] font-semibold tracking-[0.15em] text-zinc-600 uppercase">{section.group}</p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-all duration-150 ${
                      active ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                    }`}
                  >
                    <span className="text-[11px]">{item.icon}</span>
                    <span>{item.label}</span>
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {/* Recent Conversations */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between px-2">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-600 uppercase">Recent</p>
          {loaded && conversations.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        {loaded && conversations.length === 0 && (
          <p className="px-2 text-[10px] text-zinc-600 italic">No recent conversations</p>
        )}
        <ul className="space-y-0.5">
          {conversations.map((c) => {
            const active = conversationId === c.id;
            return (
              <li key={c.id}>
                <div className={`group flex items-center gap-1 rounded-lg transition-all duration-150 ${
                  active ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}>
                  <Link
                    href={`/?conversationId=${c.id}`}
                    className="flex flex-1 items-center gap-2 px-2.5 py-1.5 min-w-0"
                  >
                    <span className="text-[11px] shrink-0">◇</span>
                    <span className="truncate">{deriveTitle(c.title, c.id)}</span>
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />}
                  </Link>
                  <button
                    onClick={(e) => handleDelete(e, c.id)}
                    disabled={deleting === c.id}
                    className="mr-1 shrink-0 rounded p-1 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700/50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all disabled:opacity-30"
                    aria-label="Delete conversation"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-auto border-t border-zinc-800 px-2 pt-3">
        <p className="text-[10px] text-zinc-600">Track 01 · Pay</p>
        <p className="mt-1 text-[10px] text-zinc-700">v0.2.0</p>
      </div>

      {/* Clear All Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowClearConfirm(false)}>
          <div
            className="mx-4 w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Clear conversations"
          >
            <p className="text-sm font-semibold text-zinc-100 mb-2">Clear recent chats?</p>
            <p className="text-[11px] text-zinc-400 mb-5 leading-5">
              This will permanently remove your saved conversations and messages. Orders and purchase history will not be affected.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[11px] font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="rounded-lg bg-red-950 border border-red-900/50 px-3 py-1.5 text-[11px] font-medium text-red-300 hover:bg-red-900/30 transition-colors"
              >
                Clear history
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
