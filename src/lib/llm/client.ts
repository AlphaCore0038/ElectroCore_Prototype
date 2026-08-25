import type { ChatMessage, LLMReply, ToolDefinition } from "./types";

export class LLMError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function chatCompletion(
  messages: ChatMessage[],
  tools: ToolDefinition[]
): Promise<LLMReply> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "google/gemma-4-31b-it:free";

  if (!apiKey) {
    throw new LLMError("AI service is not configured.", 500);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let res: Response;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://electrocore.local",
        "X-Title": "ElectroCore AI Buyer",
      },
      body: JSON.stringify({
        model,
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
    console.error("OpenRouter error", res.status, text.slice(0, 500));
    if (res.status === 401 || res.status === 403) {
      throw new LLMError("AI service is not configured.", 500);
    }
    if (res.status === 429) {
      throw new LLMError("AI service is busy. Please try again.", 502);
    }
    throw new LLMError("AI service is temporarily unavailable.", 502);
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
