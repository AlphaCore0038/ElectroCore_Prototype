"use client";

import { useEffect, useState } from "react";

type Provider = {
  id: string;
  name: string;
  provider: string;
  model: string;
  configured: boolean;
};

export type AiTelemetryData = {
  provider: string;
  model: string;
  latencyMs: number;
  rounds: number;
  toolCalls: number;
  fallbackUsed: boolean;
} | null;

export function AIControl({
  selectedProvider,
  onSelectProvider,
  telemetry,
  loading,
}: {
  selectedProvider: string;
  onSelectProvider: (id: string) => void;
  telemetry: AiTelemetryData;
  loading: boolean;
}) {
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    fetch("/api/ai/providers")
      .then((r) => r.json())
      .then((j: { data?: { providers?: Provider[] } }) => { if (j.data?.providers) setProviders(j.data.providers); })
      .catch(() => {});
  }, []);

  const configured = providers.filter((p) => p.configured);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="border-b border-zinc-800 px-3 py-2">
        <p className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase">AI Control</p>
      </div>
      <div className="p-3 space-y-3">
        {/* Model selector */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase">Model</label>
          <select
            value={selectedProvider || ""}
            onChange={(e) => onSelectProvider(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[11px] text-zinc-200 focus:border-zinc-600 focus:outline-none transition-colors"
          >
            {configured.map((p) => (
              <option key={p.id} value={p.id}>{p.name} · {p.provider}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${loading ? "bg-amber-500 animate-pulse-dot" : "bg-emerald-500"}`} />
          <span className="text-[11px] text-zinc-400">{loading ? "Processing..." : "Connected"}</span>
        </div>

        {/* Telemetry */}
        {telemetry && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500">Last response</span>
              <span className="text-[11px] font-medium text-zinc-300">{(telemetry.latencyMs / 1000).toFixed(1)}s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500">Tool calls</span>
              <span className="text-[11px] font-medium text-zinc-300">{telemetry.toolCalls}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500">Rounds</span>
              <span className="text-[11px] font-medium text-zinc-300">{telemetry.rounds}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500">Provider</span>
              <span className="text-[11px] font-medium text-zinc-300">{telemetry.provider}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500">Model</span>
              <span className="text-[11px] font-medium text-zinc-300">{telemetry.model}</span>
            </div>
            {telemetry.fallbackUsed && (
              <div className="flex items-center gap-1 mt-1">
                <span className="h-1 w-1 rounded-full bg-amber-500" />
                <span className="text-[10px] text-amber-400">Fallback used</span>
              </div>
            )}
          </div>
        )}

        {!telemetry && !loading && (
          <p className="text-[10px] text-zinc-600">Send a message to see telemetry</p>
        )}
      </div>
    </div>
  );
}
