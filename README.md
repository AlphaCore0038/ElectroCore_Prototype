# ElectroCore

## Track 01 — AI Growth & Agentic Commerce

> An AI-native commerce workspace that discovers products, reasons over real catalog data, compares options, and completes deterministic Razorpay test-mode purchases through explicit user approval.

---

## ✦ Overview

ElectroCore is an AI-powered commerce assistant built around a simple principle:

> **AI can recommend. Deterministic server logic decides.**

Instead of allowing an LLM to directly control commerce operations, ElectroCore separates **AI reasoning** from **commerce-critical decisions**.

The AI handles:

- Understanding natural-language shopping requests
- Discovering relevant products
- Reasoning over retrieved catalog information
- Comparing products
- Explaining recommendations
- Finding complementary products
- Helping merchants identify cross-sell opportunities

The deterministic application layer handles:

- Product price
- Inventory
- Purchase validation
- Payment amount
- Razorpay verification
- Order creation
- Stock updates
- Audit events

This creates an AI commerce system where the model can be flexible and intelligent without being trusted with money, inventory, or order state.

---

# 🧠 Core System Flow

```text
User Request
     │
     ▼
AI Understanding
     │
     ▼
Controlled Tool Calling
     │
     ├── search_products
     ├── get_product
     ├── check_inventory
     └── find_related_products
     │
     ▼
Real Catalog Data
     │
     ▼
AI Evaluation + Reasoning
     │
     ▼
Grounded Recommendation
     │
     ├───────────────┐
     ▼               ▼
 Compare          Purchase
     │               │
     │          Explicit Approval
     │               │
     │          Purchase Intent
     │               │
     │        Server-side Price
     │               │
     │        Razorpay Checkout
     │               │
     │        HMAC Verification
     │               │
     │        Atomic Stock Update
     │               │
     └─────────┬─────┘
               ▼
             Order
               │
               ▼
          Audit Trail
               │
               ▼
      Complement Discovery
```

---

# 🏗️ Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                        │
│                                                             │
│  AI Buyer Workspace                 AI Merchant Advisor     │
│  /                                  /merchant               │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
               ┌──────────────────┐
               │  /api/ai/chat    │
               │   AI Chat Route  │
               └────────┬─────────┘
                        │
                        ▼
                  OpenRouter LLM
                        │
                        │ controlled tool calls
                        ▼
               ┌──────────────────┐
               │  Tool Allowlist  │
               ├──────────────────┤
               │ search_products  │
               │ get_product      │
               │ check_inventory  │
               │ find_related     │
               └────────┬─────────┘
                        │
                        ▼
                 Catalog Queries
                        │
                        ▼
                     Prisma
                        │
                        ▼
                 PostgreSQL / Neon


Purchase Flow:

Frontend
   │
   ▼
Purchase Intent
   │
   ▼
Deterministic Purchase Policy
   │
   ▼
Server-calculated amount
   │
   ▼
Razorpay Order
   │
   ▼
Razorpay Checkout
   │
   ▼
Payment ID + Signature
   │
   ▼
Server-side HMAC verification
   │
   ▼
Database Transaction
   ├── Order
   ├── OrderItem
   ├── Inventory decrement
   └── Payment VERIFIED
   │
   ▼
Audit Events
```

---

# 🤖 AI Architecture

## Tool-Based AI

The LLM does not directly access PostgreSQL or Prisma.

It can request a small, explicit set of operations:

```text
search_products
get_product
check_inventory
find_related_products
```

The server executes these through an allowlist.

There is no:

- `eval`
- Dynamic imports
- Arbitrary function execution
- Direct LLM database access
- Autonomous purchase tool

The AI therefore operates inside a controlled environment.

---

# 🔎 Catalog Grounding

The database is the authoritative source for product information.

A product contains information such as:

```text
Product
├── name
├── slug
├── price
├── currency
├── stock
├── status
└── attributes
```

The LLM does not become the source of truth.

For example:

```text
User:
"I need wireless headphones under ₹30,000"

        │
        ▼

LLM requests:
search_products(
    query = "wireless headphones",
    max_price = 3000000
)

        │
        ▼

Catalog

Sony WH-1000XM5
₹29,990
17 in stock
ACTIVE
Bluetooth
...

        │
        ▼

AI reasoning

        │
        ▼

Grounded recommendation
```

Product information displayed in structured UI components is verified against catalog data.

---

# 🧩 AI Reasoning vs Catalog Facts

ElectroCore intentionally separates **facts** from **reasoning**.

## Catalog Evidence

Comes from the database:

- Price
- Availability
- Stock count
- Product status
- Connectivity
- Specifications
- Compatibility

## AI Verdict

Comes from the model:

- Why the product fits the user's request
- Why one option may be preferable
- Explanation of trade-offs
- Natural-language recommendation

Example:

```text
CATALOG EVIDENCE

₹29,990
17 units available
Wireless
250g

        ↓

AI VERDICT

Strong match for the requested budget
and wireless travel use case.
```

The AI explains.

The catalog proves.

---

# 🛒 AI Buyer Workspace

The main buyer experience is intentionally designed as an **AI commerce workspace**, rather than a traditional chatbot.

The UI communicates the commerce journey:

```text
UNDERSTAND
    ↓
DISCOVER
    ↓
EVALUATE
    ↓
RECOMMEND
    ↓
COMPARE
    ↓
APPROVE
    ↓
PURCHASE
    ↓
CONFIRM
    ↓
DISCOVER COMPLEMENTS
```

The buyer workspace includes:

- AI Shopping Brief
- AI Command Bar
- Product recommendations
- AI shortlist
- Catalog evidence
- AI reasoning
- Product comparison
- Product Quick View
- Inventory intelligence
- Purchase Review
- Purchase Journey
- Order Receipt
- Session Activity
- Complementary recommendations
- Dynamic AI context panel

---

# 🧠 AI Shopping Brief

Natural-language requirements are represented visually.

Example:

```text
USER REQUEST

"I need wireless headphones under ₹30,000 for travel"


SHOPPING BRIEF

Category       Audio
Budget         ₹30,000 max
Preference     Wireless
Use case       Travel
```

The interface only displays requirements that can be confidently derived from the user's request.

No unsupported requirements are fabricated.

---

# ✦ Product Recommendations

Recommendations are represented as structured product cards.

Example:

```text
✦ AI PICK

Sony WH-1000XM5

₹29,990

● In stock
17 units available

Bluetooth
250g
Wireless
```

The structured product information comes from the catalog.

The AI explanation is shown separately.

---

# 📊 Product Evaluation

When multiple products are considered, ElectroCore can present an evaluation:

```text
AI EVALUATION

Sony WH-1000XM5
✓ Matches budget
✓ Wireless
✓ In stock

Alternative
○ Does not satisfy all stated requirements
```

The system deliberately avoids fake:

- Confidence percentages
- Match scores
- AI ratings
- Synthetic rankings

Only supported conclusions are displayed.

---

# ⚖️ Product Comparison

Users can ask:

```text
Compare Sony WH-1000XM5 and JBL Flip 6
```

The application retrieves the actual catalog records and displays a structured comparison.

Example:

```text
                    Sony XM5          JBL Flip 6

PRICE               ₹29,990           ₹...

AVAILABILITY         In stock          In stock

CONNECTIVITY         Bluetooth         Bluetooth

WEIGHT               250g             Not available

ATTRIBUTES           ...               ...
```

Missing information is displayed as unavailable rather than generated by the model.

The AI verdict is shown separately from the factual comparison.

---

# 🔍 Product Quick View

Products can be opened in a dedicated quick-view interface.

The modal can show:

- Product name
- Price
- Stock
- Description
- Attributes
- Compatibility
- AI reasoning
- Compare action
- Buy action

A product view never automatically purchases the product.

---

# 📦 Inventory Intelligence

Inventory state is based on actual database values.

Example:

```text
AVAILABILITY

● IN STOCK

17 units available
```

Out-of-stock:

```text
○ OUT OF STOCK

No units currently available
```

Stock is not generated by the LLM.

---

# 🛡️ Deterministic Purchase Safety

The LLM does not directly control purchasing.

The purchase path is:

```text
AI Recommendation
        ↓
User selects product
        ↓
Explicit "Approve & Pay"
        ↓
Purchase Intent
        ↓
Server reads product
        ↓
Server calculates total
        ↓
Razorpay Order
```

The browser and LLM cannot choose an arbitrary payment amount.

The server calculates the amount from trusted commerce data.

---

# 💳 Razorpay Integration

ElectroCore uses Razorpay in **test mode**.

```text
POST /api/payment/create
        │
        ▼
Razorpay Orders API
        │
        ▼
razorpay_order_id
        │
        ▼
Razorpay Checkout
        │
        ▼
razorpay_payment_id
razorpay_signature
        │
        ▼
POST /api/payment/verify
```

The server verifies the signature using:

```text
HMAC-SHA256(
    razorpay_order_id + "|" + razorpay_payment_id,
    RAZORPAY_KEY_SECRET
)
```

Only after successful verification does the system proceed with order creation.

---

# 🔐 Payment Security

The Razorpay secret remains server-side.

The browser receives only the information necessary for checkout, such as:

```text
keyId
razorpayOrderId
```

The server owns:

```text
RAZORPAY_KEY_SECRET
```

The secret is never passed to:

- The browser
- The LLM
- Client-side application state

---

# 📉 Inventory Concurrency

Inventory decrement uses an atomic database condition.

Conceptually:

```sql
UPDATE Product
SET stock = stock - quantity
WHERE id = productId
AND stock >= quantity;
```

If no row is updated:

```text
OUT_OF_STOCK
```

This prevents the application from relying on a stale stock snapshot when multiple payment verifications occur concurrently.

---

# 🧾 Order Creation

After successful payment verification, the order operation runs transactionally.

```text
Database Transaction
│
├── Create Order
│
├── Create OrderItem
│
├── Decrement Product Stock
│
└── Mark Payment VERIFIED
```

The `OrderItem` stores the relevant product information as an order-time snapshot.

---

# 📋 Audit Trail

Important commerce state changes are recorded.

Successful flow:

```text
INTENT_CREATED
        ↓
PAYMENT_ORDER_CREATED
        ↓
PAYMENT_VERIFIED
        ↓
ORDER_CREATED
```

Failure example:

```text
INTENT_CREATED
        ↓
PAYMENT_ORDER_CREATED
        ↓
PAYMENT_FAILED
        ↓
SIGNATURE_MISMATCH
```

A failed signature verification does not create an order or decrement inventory.

---

# 🧑‍💻 Prompt Injection Protection

The browser sends only the expected conversation data.

The server owns the system prompt and tool messages.

Conversation history is validated to reject unsupported roles and tool-related fields.

Limits include:

```text
Message length       ≤ 500
History messages     ≤ 50
History item length  ≤ 2000
AI rounds             ≤ 8
```

This prevents the client from fabricating system/tool messages or artificial tool results.

---

# 🔒 Tool Security

The AI can only execute explicitly supported tools.

```text
search_products
get_product
check_inventory
find_related_products
```

Unknown tools are rejected.

Arguments are parsed before execution.

There is no arbitrary code execution path from LLM output.

---

# 🏪 AI Merchant Advisor

The `/merchant` route provides an AI-assisted merchant experience.

A merchant selects a product:

```text
Sony WH-1000XM5
₹29,990
```

The system identifies a complementary catalog product:

```text
✦ AI CROSS-SELL OPPORTUNITY

Anker PowerCore
₹3,990

● In stock
```

The UI provides:

```text
WHY THIS PRODUCT

Compatible with the selected product.

CATALOG EVIDENCE

✓ Compatible
✓ In stock
✓ Relevant category
```

The recommendation uses deterministic catalog relationships, while the AI provides the explanation.

---

# 🔗 Complementary Recommendations

After a successful purchase, the system can continue the shopping journey.

Example:

```text
ORDER CONFIRMED

Sony WH-1000XM5
₹29,990

        ↓

AI DISCOVERY

Anker PowerCore
₹3,990

✓ Compatible
✓ In stock
✓ Relevant category
```

The system does not automatically purchase or add the product.

The user remains in control.

---

# 🧪 AI Evaluation

ElectroCore includes a deterministic evaluation suite containing **20 cases**.

The suite covers:

```text
Grounding
Budget adherence
Inventory correctness
Tool usage
Prompt injection resistance
Purchase safety
Cross-selling
Response quality
```

Run:

```bash
npm run eval
```

Or:

```bash
AI_EVAL_BASE_URL=http://localhost:3000 npm run eval
```

The evaluation system does **not** use another LLM as a judge.

Instead, it compares results against actual catalog and application truth.

This makes important commerce checks deterministic and reproducible.

---

# 🏪 Merchant + Buyer Architecture

Both experiences use the same underlying commerce foundation.

```text
                    ElectroCore
                        │
             ┌──────────┴──────────┐
             │                     │
          BUYER                 MERCHANT
             │                     │
       AI Shopping          AI Merchant Advisor
             │                     │
             └──────────┬──────────┘
                        │
                 Shared Catalog
                        │
                 Shared AI Tools
                        │
              Shared Commerce Rules
                        │
                Shared Database
```

---

# 🧰 Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 + React |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL / Neon |
| ORM | Prisma 6 |
| AI Provider | OpenRouter |
| AI Integration | Raw HTTP `fetch` + tool calling |
| Payments | Razorpay Test Mode |
| Verification | HMAC-SHA256 |
| Evaluation | Deterministic TypeScript |

The project intentionally avoids unnecessary infrastructure such as:

- LangChain
- Vector databases
- Redis
- Autonomous browser agents
- Additional agent frameworks

The architecture stays deliberately lean.

---

# 📁 Project Structure

```text
src/
├── app/
│   ├── page.tsx
│   ├── merchant/
│   │   └── page.tsx
│   └── api/
│       ├── ai/
│       ├── audit/
│       ├── catalog/
│       ├── merchant/
│       ├── payment/
│       └── purchase/
│
├── components/
│   ├── ai-processing.tsx
│   ├── context-panel.tsx
│   ├── inventory-status.tsx
│   ├── left-nav.tsx
│   ├── product-card.tsx
│   ├── product-quick-view.tsx
│   ├── purchase-journey.tsx
│   └── session-activity.tsx
│
└── lib/
    ├── ai/
    │   └── evaluation/
    │       ├── cases.ts
    │       ├── report.ts
    │       ├── runner.ts
    │       └── validators.ts
    │
    ├── audit/
    ├── catalog/
    ├── llm/
    ├── purchase/
    ├── razorpay/
    └── tools/

prisma/
└── schema.prisma

.env.example
README.md
package.json
```

---

# ⚙️ Local Setup

## Prerequisites

- Node.js >= 18.17
- PostgreSQL database
- Neon PostgreSQL recommended
- OpenRouter API key
- Razorpay test credentials

---

## 1. Install Dependencies

```bash
npm install
```

---

## 2. Configure Environment

Copy the example file:

```bash
cp .env.example .env
```

Configure:

```env
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

OPENROUTER_API_KEY=""
OPENROUTER_MODEL="google/gemma-4-31b-it:free"

RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET=""

AI_EVAL_BASE_URL="http://localhost:3000"
```

Never commit `.env`.

Only `.env.example` with placeholders should be committed.

---

# 🗄️ Database Setup

Validate Prisma:

```bash
npx prisma validate
```

Create the database schema:

```bash
npx prisma migrate dev --name init
```

Seed the catalog:

```bash
npx prisma db seed
```

The seed creates the ElectroCore merchant and sample product catalog.

---

# ▶️ Run Locally

Start the development server:

```bash
npm run dev
```

Buyer:

```text
http://localhost:3000
```

Merchant Advisor:

```text
http://localhost:3000/merchant
```

---

# 📜 Available Scripts

```bash
npm run dev
```

Start the development server.

```bash
npm run build
```

Create a production build.

```bash
npm run start
```

Start the production server.

```bash
npm run lint
```

Run ESLint.

```bash
npm run eval
```

Run the deterministic AI evaluation suite.

---

# 💳 Razorpay Test Mode

Use Razorpay test credentials.

Example test card:

```text
4111 1111 1111 1111
```

Use a future expiry and the appropriate test CVV.

No real money is transferred during the demo.

---

# 🎬 Recommended 3–5 Minute Demo

## 1. AI Discovery

Ask:

```text
I need wireless headphones under ₹30,000 for travel
```

Show:

- AI Shopping Brief
- AI Pick
- Catalog Evidence
- Inventory
- AI Verdict

---

## 2. Comparison

Ask:

```text
Compare Sony WH-1000XM5 and JBL Flip 6
```

Show:

- Structured comparison
- Actual catalog specifications
- Availability
- AI verdict

---

## 3. Purchase

Select Sony WH-1000XM5.

Click:

```text
Approve & Pay
```

Demonstrate:

```text
Purchase Review
        ↓
Razorpay Checkout
        ↓
HMAC Verification
        ↓
Payment Verified
        ↓
Order Created
        ↓
Inventory Updated
        ↓
Audit Trail
```

---

## 4. Complementary Recommendation

After purchase:

```text
You might also like
```

Show the complementary product and its catalog evidence.

---

## 5. Merchant AI

Open:

```text
/merchant
```

Select Sony WH-1000XM5.

Click:

```text
Find Cross-Sell
```

Show:

- AI cross-sell opportunity
- Compatibility
- Inventory
- Catalog evidence
- AI explanation

---

# 🧪 Example AI Scenarios

## Budget-Constrained Discovery

```text
I need wireless headphones under ₹30,000
```

Expected behavior:

- Identify budget
- Identify wireless requirement
- Search catalog
- Evaluate available products
- Recommend a grounded product

---

## Inventory Query

```text
Is the Logitech MX Master 3S in stock?
```

Expected behavior:

- Check actual inventory
- Report the product as out of stock when stock is `0`
- Avoid claiming availability

---

## Comparison

```text
Compare Sony WH-1000XM5 and JBL Flip 6
```

Expected behavior:

- Retrieve actual products
- Compare available fields
- Avoid inventing missing specifications
- Provide AI reasoning separately

---

## No-Result Query

```text
I need a refrigerator under ₹5,000
```

Expected behavior:

- Search the catalog
- Acknowledge when no matching product exists
- Avoid hallucinating a product
- Suggest an alternative only when supported

---

# 🔐 Environment & Secret Management

The following values are server-only:

```text
DATABASE_URL
OPENROUTER_API_KEY
RAZORPAY_KEY_SECRET
```

The browser must never receive these secrets.

`.env` is gitignored.

`.env.example` contains placeholders only.

---

# 🧭 Design Principles

ElectroCore follows five principles:

### 1. AI Should Reason, Not Fabricate

The model reasons over retrieved information instead of becoming the source of truth.

### 2. Tools Should Be Controlled

The model can request operations, but the server decides which operations are executable.

### 3. Money Should Be Deterministic

Payment amounts come from server-side commerce state.

### 4. Users Should Explicitly Approve Purchases

The AI cannot silently purchase products.

### 5. Trust Should Be Visible

The UI exposes catalog evidence, inventory, purchase state, payment verification, and audit state.

---

# 🚫 What ElectroCore Deliberately Does Not Do

The project intentionally does not allow the AI to:

- Automatically purchase products
- Choose arbitrary payment amounts
- Directly modify inventory
- Directly create orders
- Access database credentials
- Access Razorpay secrets
- Execute arbitrary tools
- Invent catalog facts
- Fabricate stock levels
- Fabricate payment status

This is intentional.

The goal is not simply to build an autonomous agent.

The goal is to build a **trustworthy AI commerce system**.

---

# 📌 Current Scope

## Buyer

- [x] Natural-language AI shopping
- [x] Catalog-grounded recommendations
- [x] Product cards
- [x] AI Shopping Brief
- [x] Product shortlist
- [x] Product comparison
- [x] Product Quick View
- [x] Inventory awareness
- [x] Purchase Review
- [x] Explicit approval
- [x] Razorpay test-mode checkout
- [x] Server-side payment verification
- [x] Order creation
- [x] Atomic inventory update
- [x] Audit trail
- [x] Complementary recommendations
- [x] Purchase Journey
- [x] Session Activity
- [x] Dynamic Context Panel

## Merchant

- [x] AI Merchant Advisor
- [x] Product selection
- [x] Cross-sell recommendation
- [x] Compatibility evidence
- [x] Inventory evidence
- [x] AI explanation
- [x] Cross-sell candidates

## Engineering

- [x] Controlled AI tools
- [x] Input validation
- [x] Prompt-injection protections
- [x] Server-side pricing
- [x] Payment signature verification
- [x] Transactional order creation
- [x] Atomic inventory decrement
- [x] Audit trail
- [x] Deterministic evaluation suite
- [x] 20 evaluation cases
- [x] Race-condition protection
- [x] No secret exposure to client/LLM

---

# 🏆 Final Architecture Principle

ElectroCore is built around one central idea:

> **The AI should be powerful enough to reason about commerce, but never trusted with the authority to define commerce truth.**

```text
AI Intelligence
       +
Controlled Tools
       +
Real Catalog Data
       +
Deterministic Purchase Policy
       +
Secure Payment Verification
       +
Transactional Inventory
       +
Auditability
       =
AI-Native Commerce
```

---