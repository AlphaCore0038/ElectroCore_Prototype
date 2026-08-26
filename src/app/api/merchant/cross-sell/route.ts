import { NextResponse } from "next/server";
import { getProductByIdOrSlug } from "@/lib/catalog/queries";
import { findRelatedProducts } from "@/lib/tools/find-related";
import { chatCompletion } from "@/lib/llm/client";

const MERCHANT_PROMPT =
  "You are ElectroCore merchant advisor. Given a purchased product and candidate complements, pick the single best complement and explain why in one sentence. Cite compatibleWith, category, price or stock from the candidates. Do not invent products or relationships. Keep reason concise.";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("product")?.trim() || "";
  if (!raw) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "product is required" }, { status: 400 });
  }

  const limitRaw = searchParams.get("limit");
  let limit: number | undefined;
  if (limitRaw !== null) {
    const n = Number(limitRaw);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "limit must be 1-5" }, { status: 400 });
    }
    limit = n;
  }

  const source = await getProductByIdOrSlug(raw);
  if (!source) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND", message: "Product not found" }, { status: 404 });
  }

  const related = await findRelatedProducts({ product: source.slug, limit: limit ?? 3 });
  if (!related.ok) {
    return NextResponse.json({ ok: false, error: related.error, message: related.message }, { status: 400 });
  }

  const candidates = related.data.products;
  if (candidates.length === 0) {
    return NextResponse.json({
      ok: true,
      data: {
        source: { id: source.id, slug: source.slug, name: source.name },
        recommendation: null,
        reason: "No related in-stock products found",
      },
    });
  }

  const candidateData = candidates.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    price: c.price,
    currency: c.currency,
    category: c.category,
    attributes: c.attributes,
  }));

  let reason: string | null = null;
  try {
    const reply = await chatCompletion(
      [
        { role: "system", content: MERCHANT_PROMPT },
        {
          role: "user",
          content: JSON.stringify({ source: { slug: source.slug, name: source.name, category: source.category, attributes: source.attributes }, candidates: candidateData }),
        },
      ],
      []
    );
    reason = reply.content?.trim() || null;
  } catch {
    reason = null;
  }

  if (!reason) {
    const top = candidates[0];
    const compat = (top.attributes as { compatibleWith?: string[] } | null)?.compatibleWith?.includes(source.slug)
      ? "compatible with"
      : top.category === source.category
        ? "same category"
        : "complement";
    reason = `${top.name} is ${compat} ${source.name} and in stock at ${(top.price / 100).toFixed(0).replace(/\.00$/, "")} INR.`;
  }

  return NextResponse.json({
    ok: true,
    data: {
      source: { id: source.id, slug: source.slug, name: source.name },
      recommendation: candidates[0],
      reason,
      candidates,
    },
  });
}
