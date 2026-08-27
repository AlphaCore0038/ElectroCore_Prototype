import type { ChatMessage, LLMReply, ToolDefinition } from "./types";

export class LLMError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type ProviderConfig = {
  name: string;
  displayName: string;
  endpoint: string;
  apiKey: string;
  model: string;
  headers: Record<string, string>;
};

export type AiTelemetry = {
  provider: string;
  model: string;
  latencyMs: number;
  rounds: number;
  toolCalls: number;
  fallbackUsed: boolean;
};

export type AiCompletionResult = LLMReply & { telemetry: AiTelemetry };

const PROVIDER_ALLOWLIST: Record<string, (env: NodeJS.ProcessEnv) => ProviderConfig | null> = {
  "mimo-v2.5-free": (env) => {
    const apiKey = env.OPENCODE_ZEN_API_KEY;
    if (!apiKey) return null;
    return {
      name: "opencode-zen",
      displayName: "OpenCode Zen",
      endpoint: "https://opencode.ai/zen/v1/chat/completions",
      apiKey,
      model: env.OPENCODE_ZEN_MODEL || "mimo-v2.5-free",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    };
  },
  "openrouter-default": (env) => {
    const apiKey = env.OPENROUTER_API_KEY;
    if (!apiKey) return null;
    return {
      name: "openrouter",
      displayName: "OpenRouter",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey,
      model: env.OPENROUTER_MODEL || "google/gemma-4-31b-it:free",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://electrocore.local",
        "X-Title": "ElectroCore AI Buyer",
      },
    };
  },
};

function getDefaultProvider(env: NodeJS.ProcessEnv): ProviderConfig | null {
  const providerName = env.AI_PROVIDER || "openrouter";
  if (providerName === "opencode-zen") {
    return PROVIDER_ALLOWLIST["mimo-v2.5-free"](env);
  }
  return PROVIDER_ALLOWLIST["openrouter-default"](env);
}

export function getAvailableProviders(): { id: string; name: string; provider: string; model: string; configured: boolean }[] {
  return [
    {
      id: "mimo-v2.5-free",
      name: "MiMo 2.5",
      provider: "OpenCode Zen",
      model: process.env.OPENCODE_ZEN_MODEL || "mimo-v2.5-free",
      configured: !!process.env.OPENCODE_ZEN_API_KEY,
    },
    {
      id: "openrouter-default",
      name: "Gemma",
      provider: "OpenRouter",
      model: process.env.OPENROUTER_MODEL || "google/gemma-4-31b-it:free",
      configured: !!process.env.OPENROUTER_API_KEY,
    },
  ];
}

async function callProvider(
  provider: ProviderConfig,
  messages: ChatMessage[],
  tools: ToolDefinition[]
): Promise<LLMReply> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let res: Response;
  try {
    res = await fetch(provider.endpoint, {
      method: "POST",
      headers: provider.headers,
      body: JSON.stringify({
        model: provider.model,
        messages,
        tools,
        tool_choice: "auto",
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new LLMError("AI took too long. Please try again.", 504);
    }
    throw new LLMError("AI service is temporarily unavailable.", 502);
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[ai] provider=${provider.name} error ${res.status}`, text.slice(0, 300));
    throw new LLMError(
      res.status === 429 ? "AI service is busy." : "AI service is temporarily unavailable.",
      res.status
    );
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new LLMError("AI returned an unexpected response.", 502);
  }

  const choices = (json as { choices?: unknown[] })?.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new LLMError("AI returned an unexpected response.", 502);
  }

  const msg = (choices[0] as { message?: unknown })?.message as
    | { content?: unknown; tool_calls?: unknown }
    | undefined;

  if (!msg || (msg.content === undefined && msg.tool_calls === undefined)) {
    throw new LLMError("AI returned an unexpected response.", 502);
  }

  const content = typeof msg.content === "string" ? msg.content : msg.content == null ? null : String(msg.content);

  let tool_calls: LLMReply["tool_calls"];
  if (Array.isArray(msg.tool_calls)) {
    tool_calls = msg.tool_calls
      .filter(
        (tc): tc is { id: string; type: string; function: { name: string; arguments: string } } =>
          typeof tc === "object" &&
          tc !== null &&
          typeof (tc as { id?: unknown }).id === "string" &&
          typeof (tc as { function?: unknown }).function === "object"
      )
      .map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: {
          name: String((tc.function as { name?: unknown }).name ?? ""),
          arguments: typeof (tc.function as { arguments?: unknown }).arguments === "string"
            ? (tc.function as { arguments: string }).arguments
            : JSON.stringify((tc.function as { arguments?: unknown }).arguments ?? {}),
        },
      }));
    if (tool_calls.length === 0) tool_calls = undefined;
  }

  return { content: content ?? null, tool_calls };
}

function isTransientError(err: unknown): boolean {
  if (err instanceof LLMError) {
    return err.status === 429 || err.status >= 500;
  }
  return false;
}

export async function chatCompletion(
  messages: ChatMessage[],
  tools: ToolDefinition[],
  providerId?: string
): Promise<AiCompletionResult> {
  const start = performance.now();
  let fallbackUsed = false;

  // Resolve provider
  let primary: ProviderConfig | null = null;

  if (providerId && PROVIDER_ALLOWLIST[providerId]) {
    primary = PROVIDER_ALLOWLIST[providerId](process.env);
  }

  if (!primary) {
    primary = getDefaultProvider(process.env);
  }

  if (!primary) {
    // Try fallback
    const fallbackId = providerId === "mimo-v2.5-free" ? "openrouter-default" : "mimo-v2.5-free";
    const fallback = PROVIDER_ALLOWLIST[fallbackId]?.(process.env);
    if (!fallback) {
      throw new LLMError("AI service is not configured.", 500);
    }
    console.log(`[ai] provider=${fallback.displayName} model=${fallback.model} (primary not configured)`);
    const result = await callProvider(fallback, messages, tools);
    const latencyMs = Math.round(performance.now() - start);
    return { ...result, telemetry: { provider: fallback.displayName, model: fallback.model, latencyMs, rounds: 1, toolCalls: 0, fallbackUsed: true } };
  }

  console.log(`[ai] provider=${primary.displayName} model=${primary.model}`);

  try {
    const result = await callProvider(primary, messages, tools);
    const latencyMs = Math.round(performance.now() - start);
    return { ...result, telemetry: { provider: primary.displayName, model: primary.model, latencyMs, rounds: 1, toolCalls: 0, fallbackUsed } };
  } catch (err) {
    if (!isTransientError(err)) throw err;

    const fallbackId = primary.name === "opencode-zen" ? "openrouter-default" : "mimo-v2.5-free";
    const fallback = PROVIDER_ALLOWLIST[fallbackId]?.(process.env);
    if (!fallback) throw err;

    console.log(`[ai] provider=${primary.displayName} failed, falling back to ${fallback.displayName}`);
    fallbackUsed = true;
    const result = await callProvider(fallback, messages, tools);
    const latencyMs = Math.round(performance.now() - start);
    return { ...result, telemetry: { provider: fallback.displayName, model: fallback.model, latencyMs, rounds: 1, toolCalls: 0, fallbackUsed } };
  }
}
