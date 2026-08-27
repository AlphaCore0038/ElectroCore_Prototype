"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Conversation = {
  id: string;
  title: string | null;
  updatedAt: string;
};

function deriveTitle(title: string | null, id: string) {
  if (title && title.length > 0) return title.length > 28 ? title.slice(0, 28) + "…" : title;
  return id.slice(0, 12) + "…";
}

export function LeftNav({ conversationId }: { conversationId?: string | null }) {
  const pathname = usePathname();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/conversations?limit=10")
      .then((r) => r.json())
      .then((j: { data?: Conversation[] }) => {
        if (j.data) setConversations(j.data);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

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
        <p className="mb-1.5 px-2 text-[10px] font-semibold tracking-[0.15em] text-zinc-600 uppercase">Recent</p>
        {loaded && conversations.length === 0 && (
          <p className="px-2 text-[10px] text-zinc-600 italic">No recent conversations</p>
        )}
        <ul className="space-y-0.5">
          {conversations.map((c) => {
            const active = conversationId === c.id;
            return (
              <li key={c.id}>
                <Link
                  href={`/?conversationId=${c.id}`}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-all duration-150 ${
                    active ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  }`}
                >
                  <span className="text-[11px]">◇</span>
                  <span className="truncate">{deriveTitle(c.title, c.id)}</span>
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-auto border-t border-zinc-800 px-2 pt-3">
        <p className="text-[10px] text-zinc-600">Track 01 · Pay</p>
        <p className="mt-1 text-[10px] text-zinc-700">v0.2.0</p>
      </div>
    </nav>
  );
}
