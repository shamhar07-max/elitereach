# Elite Reach — Demand Intelligence Platform

AI-assisted demand intelligence for Elite Escape Tourism: identifies
emerging travel demand and commercial opportunities from public signals,
scores them transparently, and hands qualified opportunities to the real
Elite Escape OS CRM — a separate system from the OS itself, connected only
through one API call, the same architectural pattern already used between
the public website and the OS.

**Status: Phase 1 (Production Foundation) only.** Per the client's own
phased build plan (`docs/ELITE_REACH_BUILD_PLAN.md`), this is deliberately
scoped to: PostgreSQL, authentication, permissions, the connector
framework, campaign management, signal ingestion, normalized storage,
deduplication, and deterministic rule-based scoring. Phases 2-8 (journeys/
identity resolution, content-gap and product-opportunity engines,
engagement copilot, revenue attribution, feedback learning, the strategy
layer) are **not started** — see the build plan doc for why building them
now would be premature.

## Architecture

```
apps/
  api/   NestJS + TypeScript + PostgreSQL (Drizzle ORM) + Redis/BullMQ
  web/   Next.js + React + TypeScript — Command Center, Opportunities,
         Connectors, Campaigns, manual signal import
```

Two apps, one Postgres database, one Redis instance backing the BullMQ
queue that runs the signal-processing pipeline asynchronously. The BullMQ
worker runs in-process with the API for now (see the comment in
`apps/api/src/modules/signals/pipeline.processor.ts` for why that's a
legitimate choice at this scale, not a shortcut).

## The pipeline, as actually built

```
POST /api/signals/import (or a real connector's fetchNew())
  -> normalize + hash (exact-duplicate check against tenant+source+author+text)
  -> enqueue BullMQ job
  -> IntentExtractionService   (Level 1 — deterministic rules, no LLM)
  -> ScoringService            (the client's exact weighted rubric, always explained)
  -> OpportunityClassifierService (12-type classification, spam/irrelevant filtered out)
  -> stored as an Opportunity, visible in the dashboard
  -> human reviews it and, if it's worth pursuing, clicks "Push to CRM"
  -> POST to the real Elite Escape OS's /api/public/leads
  -> CRM lead ID stored back on the opportunity
```

No AI/LLM call happens anywhere in Phase 1 — every extraction, score, and
classification is a traceable rule. This matches the client's own "Level 1
— Deterministic" tier and keeps Phase 1 honestly labeled as rule-based
rather than claiming AI capability it doesn't have yet.

## Connectors

| Connector | Access type | Production level | Why |
|---|---|---|---|
| `manual` | Manual import | **Production** | Fully working — a human pastes real public text, it runs through the real pipeline. No external ToS at risk. |
| `reddit` | Official API (OAuth2) | Disabled | Needs a registered Reddit app (`REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET`) this environment doesn't have. Scaffolded, not scraping — the interface is ready for real credentials. |
| `youtube` | Official API (Data API v3) | Disabled | Needs a Google Cloud project + API key. Same pattern. |

Every connector reports its own honest health (`healthy`/`degraded`/`down`)
and production level — the dashboard never claims a connector works when
it doesn't.

## Quick start

Requires PostgreSQL and Redis running locally (or point `DATABASE_URL`/
`REDIS_HOST` at your own).

```bash
# 1. Database
createdb elite_reach
cd apps/api
cp .env.example .env   # edit DATABASE_URL etc. if needed
npm install
npx drizzle-kit generate && npx drizzle-kit migrate
npm run build && npm start   # http://localhost:4200

# 2. Web dashboard (separate terminal)
cd apps/web
npm install
npm run build && npm start   # http://localhost:3300
```

First run: open the web app, click "Bootstrap an account" (this only ever
works once — every account after that needs an existing user, same
lock-after-first-user pattern as the OS platform). Then seed the default
connectors from the Connectors tab, and import a test batch from the
Import tab to see the pipeline run.

## Integration with Elite Escape OS

Set `ELITE_ESCAPE_OS_URL` (default `http://localhost:4100`) to point at a
running Elite Escape OS instance. Pushing an opportunity to CRM calls its
real `POST /api/public/leads` endpoint — the OS needed two small,
additive changes to support this cleanly:

1. `sourceChannel` enum extended with `"elite_reach"` (was: contact_form/
   callback_modal/deal_alerts/chatbot only).
2. The endpoint now returns the created `leadId`/`customerId` (was:
   `{ ok: true }` only) so Elite Reach can store the real CRM link.

Both changes are backward compatible — the website's existing fire-and-
forget calls are unaffected.

Deliberately **not** done: fabricating a customer identity for an
anonymous public signal. A pushed lead's "customer" is a placeholder
record (`"Elite Reach — <source> signal #<id>"`, no phone/email) that a
human then works from — this respects the client's own rule against
harvesting public contact info into marketing lists, and matches their
specified handoff sequence (human qualifies, *then* `createLead()`).

## What's deliberately not here yet

See `docs/ELITE_REACH_BUILD_PLAN.md` for the full phase-by-phase
reasoning. In short: journeys/identity resolution, AI-based (not
rule-based) intent extraction, the content-gap/product-opportunity/market-
trigger engines, the engagement copilot, reputation scoring, revenue
attribution, and the feedback-learning loop are all later phases in the
client's own plan, not oversights in this one.
