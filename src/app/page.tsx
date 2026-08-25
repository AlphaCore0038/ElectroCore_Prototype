"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function Home() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    if (text.length > 500) {
      setError("Message must be at most 500 characters.");
      return;
    }
    setError(null);
    const nextMsgs: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(nextMsgs);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: msgs }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { message?: { content?: string } };
        error?: string;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.message || "Something went wrong. Please try again.");
        setMsgs((m) => m.slice(0, -1));
        return;
      }
      const reply = json.data?.message?.content?.trim();
      if (!reply) {
        setError("AI returned an empty response.");
        setMsgs((m) => m.slice(0, -1));
        return;
      }
      setMsgs([...nextMsgs, { role: "assistant", content: reply }]);
    } catch {
      setError("Network error. Please try again.");
      setMsgs((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-sm font-semibold tracking-tight text-zinc-100">ElectroCore</p>
            <p className="text-xs tracking-widest text-zinc-500 uppercase">AI Shopping Assistant</p>
          </div>
          <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
            Track 01 · Read-only
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6 sm:px-6">
            {msgs.length === 0 && !loading && (
              <div className="py-12">
                <h1 className="text-2xl font-semibold tracking-tight">What are you shopping for?</h1>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Ask in plain language. Real products, real prices, real availability from the ElectroCore catalog.
                </p>
                <div className="mt-6 grid gap-2">
                  {[
                    "What headphones do you have?",
                    "I need a keyboard under \u20B95,000",
                    "Is the Logitech MX Master 3S in stock?",
                    "Tell me about the Sony WH-1000XM5",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-left text-sm text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-zinc-100 text-zinc-900"
                      : "border border-zinc-800 bg-zinc-900 text-zinc-100"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-400 animate-pulse">
                  Thinking…
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-zinc-800 bg-zinc-950">
          <div className="mx-auto w-full max-w-2xl px-4 py-4 sm:px-6">
            {error && (
              <p className="mb-3 rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-2 text-sm text-red-300">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={"Ask about products — e.g. wireless headphones under ₹3,000"}
                maxLength={500}
                disabled={loading}
                className="flex-1 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={send}
                disabled={loading || input.trim().length === 0}
                className="rounded-full bg-zinc-100 px-6 py-3 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-40"
              >
                Send
              </button>
            </div>
            <p className="mt-2 text-xs text-zinc-600">Grounded in the real ElectroCore catalog. No invented products or prices.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
