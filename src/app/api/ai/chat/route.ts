import { NextResponse } from "next/server";
import { chatCompletion, LLMError } from "@/lib/llm/client";
import { executeTool, toolDefinitions } from "@/lib/llm/tools";
import type { ChatMessage } from "@/lib/llm/types";

const SYSTEM_PROMPT =
  "You are ElectroCore's shopping assistant. You help customers find products from the ElectroCore electronics catalog.\n\nRules:\n- Use the provided commerce tools to search, inspect, and verify products.\n- Never invent products, prices, specifications, or availability.\n- Base recommendations on actual tool results.\n- Prices returned by tools are in paise. Display prices to users in INR.\n- If a product is out of stock, say so and suggest alternatives.\n- If a search returns no products, do not retry the same search with paraphrased terms. Acknowledge that there is no exact match and, when useful, suggest a relevant alternative from the catalog.\n- Once you have enough information to answer the user's request, stop calling tools and provide the answer.\n- You can recommend products and discuss purchases, but you cannot initiate or complete payment. Payment requires explicit user approval in the application.\n- Do not claim a purchase was made.\n- Keep recommendations concise and useful.";

const MAX_ROUNDS = 8;
const MAX_HISTORY = 50;
const MAX_MESSAGE = 500;

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

  const b = body as { message?: unknown; history?: unknown };

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
      // reject tool/system injection: ensure no extra fields
      const extra = Object.keys(item as object).some((k) => k !== "role" && k !== "content");
      if (extra) {
        return bad("Invalid conversation format.");
      }
      history.push({ role, content: content.trim() });
    }
  }

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((h) => ({ role: h.role, content: h.content } as ChatMessage)),
    { role: "user", content: message },
  ];

  console.log(`[ai] request: "${message.slice(0, 80)}" history=${history.length}`);

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const reply = await chatCompletion(messages, toolDefinitions);

      const hasTools = reply.tool_calls && reply.tool_calls.length > 0;

      if (!hasTools) {
        const final = reply.content?.trim() || "I could not find a suitable product for that request.";
        console.log(`[ai] done in ${round + 1} rounds`);
        return NextResponse.json({ ok: true, data: { message: { role: "assistant", content: final } } });
      }

      messages.push({
        role: "assistant",
        content: reply.content ?? null,
        tool_calls: reply.tool_calls!,
      });

      for (const tc of reply.tool_calls!) {
        const name = tc.function.name;
        const args = tc.function.arguments;
        console.log(`[ai] tool ${name} ${args.slice(0, 120)}`);
        let result: string;
        try {
          result = await executeTool(name, args);
        } catch (e) {
          console.error(`[ai] tool ${name} threw`, e);
          result = JSON.stringify({ ok: false, error: "INTERNAL_ERROR", message: "Tool failed" });
        }
        console.log(`[ai] tool ${name} done`);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        message: {
          role: "assistant",
          content: "I'm having trouble completing this request right now. Please try a simpler question.",
        },
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
