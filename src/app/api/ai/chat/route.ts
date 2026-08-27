import { NextResponse } from "next/server";
import { chatCompletion, LLMError } from "@/lib/llm/client";
import { executeTool, toolDefinitions } from "@/lib/llm/tools";
import type { ChatMessage } from "@/lib/llm/types";
import { createConversation, getConversationWithMessages, addMessage, generateTitle } from "@/lib/conversations/queries";
import { appendEvent } from "@/lib/event-store";

const SYSTEM_PROMPT =
  "You are ElectroCore's shopping assistant. You help customers find products from the ElectroCore electronics catalog.\n\nRules:\n- Use the provided commerce tools to search, inspect, and verify products.\n- Translate natural-language constraints — budget in ₹, category, wireless/wired/bluetooth/usb-c, intended use like travel/coding/long sessions — into tool arguments (query, category, max_price, in_stock) and judge suitability from returned attributes.specs and attributes.compatibleWith.\n- Never invent products, prices, specifications, or availability.\n- Base recommendations on actual tool results.\n- Prices returned by tools are in paise. Display prices to users in INR.\n- For every recommendation give 2-4 concise bullets why it fits the user's stated budget/requirements/use, citing tool results (price, availability, specs). Do not use confidence scores.\n- When the user asks to compare products, call get_product for each and clearly separate factual catalog data from your reasoning.\n- If a product is out of stock, say so and suggest alternatives.\n- If a search returns no products, do not retry the same search with paraphrased terms. Acknowledge that there is no exact match and, when useful, suggest a relevant alternative from the catalog.\n- Use find_related_products to discover compatible or same-category complements when relevant; never invent a compatibility relationship.\n- Once you have enough information to answer the user's request, stop calling tools and provide the answer.\n- You can recommend products and discuss purchases, but you cannot initiate or complete payment. Payment requires explicit user approval in the application.\n- Do not claim a purchase was made.\n- Keep recommendations concise and useful.";

const MAX_ROUNDS = 8;
const MAX_HISTORY = 50;
const MAX_MESSAGE = 500;

const ALLOWED_PROVIDER_IDS = ["mimo-v2.5-free", "openrouter-default"];

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: "BAD_REQUEST", message }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return bad("Invalid JSON");
  }

  const b = body as { message?: unknown; history?: unknown; conversationId?: unknown; providerId?: unknown };

  if (typeof b.message !== "string") {
    return bad("Message is required.");
  }
  const message = b.message.trim();
  if (message.length === 0) {
    return bad("Message is required.");
  }
  if (message.length > MAX_MESSAGE) {
    return bad(`Message must be at most ${MAX_MESSAGE} characters`);
  }

  // Validate providerId against allowlist
  let providerId: string | undefined;
  if (typeof b.providerId === "string" && b.providerId.trim()) {
    const pid = b.providerId.trim();
    if (!ALLOWED_PROVIDER_IDS.includes(pid)) {
      return bad("Invalid provider.");
    }
    providerId = pid;
  }

  const history: { role: "user" | "assistant"; content: string }[] = [];
  if (b.history !== undefined) {
    if (!Array.isArray(b.history)) {
      return bad("Invalid conversation format.");
    }
    if (b.history.length > MAX_HISTORY) {
      return bad("Conversation is too long. Please start a new chat.");
    }
    for (const item of b.history) {
      if (
        typeof item !== "object" ||
        item === null ||
        !("role" in item) ||
        !("content" in item)
      ) {
        return bad("Invalid conversation format.");
      }
      const role = (item as { role: unknown }).role;
      const content = (item as { content: unknown }).content;
      if (role !== "user" && role !== "assistant") {
        return bad("Invalid conversation format.");
      }
      if (typeof content !== "string" || content.trim().length === 0) {
        return bad("Invalid conversation format.");
      }
      if (content.trim().length > 2000) {
        return bad("Invalid conversation format.");
      }
      const extra = Object.keys(item as object).some((k) => k !== "role" && k !== "content");
      if (extra) {
        return bad("Invalid conversation format.");
      }
      history.push({ role, content: content.trim() });
    }
  }

  // Conversation persistence
  let conversationId = typeof b.conversationId === "string" ? b.conversationId.trim() : "";
  let isNewConversation = false;

  if (conversationId) {
    const existing = await getConversationWithMessages(conversationId);
    if (!existing) conversationId = "";
  }

  if (!conversationId) {
    const conv = await createConversation(generateTitle(message));
    conversationId = conv.id;
    isNewConversation = true;
  }

  await addMessage(conversationId, "user", message);
  appendEvent({ type: "CHAT_MESSAGE", conversationId, role: "user", content: message.slice(0, 100) });

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((h) => ({ role: h.role, content: h.content } as ChatMessage)),
    { role: "user", content: message },
  ];

  console.log(`[ai] request: "${message.slice(0, 80)}" history=${history.length}`);

  const start = performance.now();
  let totalToolCalls = 0;
  let rounds = 0;
  let lastTelemetry = { provider: "", model: "", latencyMs: 0, fallbackUsed: false };

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      rounds = round + 1;
      const result = await chatCompletion(messages, toolDefinitions, providerId);
      lastTelemetry = { provider: result.telemetry.provider, model: result.telemetry.model, latencyMs: result.telemetry.latencyMs, fallbackUsed: result.telemetry.fallbackUsed };

      const hasTools = result.tool_calls && result.tool_calls.length > 0;

      if (!hasTools) {
        const final = result.content?.trim() || "I could not find a suitable product for that request.";
        console.log(`[ai] done in ${rounds} rounds`);
        await addMessage(conversationId, "assistant", final);

        const totalLatencyMs = Math.round(performance.now() - start);
        const ai = { ...lastTelemetry, latencyMs: totalLatencyMs, rounds, toolCalls: totalToolCalls };

        appendEvent({ type: "AI_RESPONSE", conversationId, content: final.slice(0, 100), provider: ai.provider, model: ai.model, latencyMs: ai.latencyMs, rounds: ai.rounds, toolCalls: ai.toolCalls });

        return NextResponse.json({ ok: true, data: { message: { role: "assistant", content: final }, conversationId, isNewConversation, ai } });
      }

      messages.push({
        role: "assistant",
        content: result.content ?? null,
        tool_calls: result.tool_calls!,
      });

      for (const tc of result.tool_calls!) {
        const name = tc.function.name;
        const args = tc.function.arguments;
        totalToolCalls++;
        console.log(`[ai] tool ${name} ${args.slice(0, 120)}`);
        appendEvent({ type: "TOOL_REQUEST", conversationId, tool: name });
        let toolResult: string;
        try {
          toolResult = await executeTool(name, args);
        } catch (e) {
          console.error(`[ai] tool ${name} threw`, e);
          toolResult = JSON.stringify({ ok: false, error: "INTERNAL_ERROR", message: "Tool failed" });
        }
        console.log(`[ai] tool ${name} done`);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: toolResult,
        });
      }
    }

    const fallback = "I'm having trouble completing this request right now. Please try a simpler question.";
    await addMessage(conversationId, "assistant", fallback);
    const totalLatencyMs = Math.round(performance.now() - start);
    return NextResponse.json({
      ok: true,
      data: {
        message: { role: "assistant", content: fallback },
        conversationId,
        isNewConversation,
        ai: { ...lastTelemetry, latencyMs: totalLatencyMs, rounds, toolCalls: totalToolCalls },
      },
    });
  } catch (err) {
    if (err instanceof LLMError) {
      const code = err.status === 500 ? "CONFIG_ERROR" : err.status === 504 ? "TIMEOUT" : "LLM_ERROR";
      console.error("[ai] LLMError", err.message);
      return NextResponse.json({ ok: false, error: code, message: err.message }, { status: err.status });
    }
    console.error("[ai] unexpected", err);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
