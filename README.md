# Agentic Commerce — Track 01: AI Growth & Agentic Commerce

AI buyer that discovers products, reasons over real catalog data, and completes deterministic Razorpay test-mode purchases via explicit user approval.

## Tech Stack

- Next.js 16 (App Router) + TypeScript (strict) + Tailwind CSS 4 + ESLint
- Prisma 6 + PostgreSQL (Neon)
- OpenRouter (raw `fetch`, model via `OPENROUTER_MODEL`)
- Razorpay Checkout (test mode, `fetch` Orders + HMAC verify)

## Prerequisites

- Node.js >= 18.17
- PostgreSQL (Neon) `DATABASE_URL`
- OpenRouter API key (free tier OK) + Razorpay test keys for payment demo

## Setup

```bash
npm install
cp .env.example .env
# edit .env with real values (never commit .env)
npx prisma migrate dev
npx prisma db seed   # creates ElectroCore merchant + 10 products
npm run dev          # http://localhost:3000
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection (`sslmode=require` for Neon) |
| `OPENROUTER_API_KEY` | yes | OpenRouter key (`sk-or-v1-...`) |
| `OPENROUTER_MODEL` | no | Model id, default `google/gemma-4-31b-it:free` |
| `RAZORPAY_KEY_ID` | for payment demo | Razorpay test `rzp_test_...` (public) |
| `RAZORPAY_KEY_SECRET` | for payment demo | Razorpay test secret (server-only, never to client/LLM) |

`AI_EVAL_BASE_URL` (optional, for `npm run eval`): default `http://localhost:3000`.

Real secrets must never be committed. `.env` is gitignored; only `.env.example` (placeholders) is tracked.

## Prisma

```bash
npx prisma validate
npx prisma migrate dev --name init
npx prisma db seed
```

## Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run start` — start prod
- `npm run lint` — ESLint
- `npm run eval` — AI evaluation suite (`tsx src/lib/ai/evaluation/runner.ts`), requires `npm run dev` in another terminal; respects `AI_EVAL_BASE_URL`

## Razorpay Test Mode

Payment uses **test mode only**. No real money moves.

- Get test keys: https://dashboard.razorpay.com/app/website-app-settings/api-keys (Test Mode)
- Checkout test card: **4111 1111 1111 1111**, any future expiry, CVV `123`
- Server creates Order with `amount: intent.total` (paise, DB price), client receives only `keyId` + `order_id`, server verifies `HMAC SHA256 order|payment`.

## Demo Flow (3–5 min)

1. **Chat** `I need wireless headphones under ₹30,000` → `search_products` → **Sony WH-1000XM5 ₹29,990** + 2-4 grounded bullets.
2. **Compare** `Compare Sony WH-1000XM5 and JBL Flip 6` → two `get_product` + factual table.
3. **Purchase** select `Sony WH-1000XM5` → `Approve & Pay` → `IntentCreated 2999000` → Razorpay Checkout (test card) → `HMAC verify` → `Order PAID`, `stock 18→17`, `Audit ORDER_CREATED`.
4. **Post-purchase** `You might also like → Show complement` → deterministic `find_related_products` + AI reason (e.g., `Anker PowerCore 20000` compatible).
5. **Merchant** `/merchant` → select `Sony WH-1000XM5` → `Find Cross-Sell` → AI merchant advisor picks best `compatibleWith` complement and explains.

- **Buyer:** `/` — AI Shopping Assistant
- **Merchant advisor:** `/merchant` — AI Merchant Advisor

## Evaluation

```bash
# in one terminal
npm run dev
# in another
AI_EVAL_BASE_URL=http://localhost:3000 npm run eval
```

Covers grounding, budget, inventory, tool-use, injection, purchase-safety, cross-sell (20 cases, deterministic, no LLM judge).

## Security Notes

- LLM never sees `DATABASE_URL`/`RAZORPAY_KEY_SECRET`; `amount` always server-calculated from `Product.price`.
- `history` capped `50×2000`, `message 500`, `MAX_ROUNDS 8`, `tool_calls` allowlisted.
