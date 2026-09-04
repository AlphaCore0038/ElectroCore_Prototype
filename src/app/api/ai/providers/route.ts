import { NextResponse } from "next/server";
import { getAvailableProviders } from "@/lib/llm/client";

function getActiveProviderId(): string {
  const providerName = process.env.AI_PROVIDER || "openrouter";
  return providerName === "opencode-zen" ? "mimo-v2.5-free" : "openrouter-default";
}

export async function GET() {
  const providers = getAvailableProviders();
  const active = getActiveProviderId();
  return NextResponse.json({ ok: true, data: { providers, active } });
}
