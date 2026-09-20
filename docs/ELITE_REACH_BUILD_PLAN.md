# Elite Reach — Build Plan

Reproduces the client's own 8-phase plan and records exactly what's built.

| Phase | Scope (client's own words) | Status |
|---|---|---|
| **1. Production foundation** | PostgreSQL, authentication, permissions, connector framework, campaign management, signal ingestion, normalized storage, deduplication, existing rule scoring | **Done.** See below for specifics. |
| 2. Intent Intelligence | intent taxonomy, structured extraction, journeys, priority scoring, commercial classification, lead decay, AI evaluation dataset | **Done except the evaluation dataset.** Structured extraction + scoring + commercial classification shipped in Phase 1; journeys, lead decay, and the admin-managed taxonomy (below) are now built too. Only the AI evaluation dataset remains, deliberately deferred — it needs real labeled data from actual usage, which doesn't exist yet with zero live connectors. |
| 3. Opportunity Intelligence | content gaps, product opportunities, B2B, partnerships, reputation, competitor signals | Partial — the classifier already distinguishes `direct_lead`/`b2b_opportunity`/`spam`/`irrelevant`/`early_intent`; `content_gap`, `product_opportunity`, `partnership`, `reputation_risk`, and `competitor_signal` are classified as a type in the enum but nothing populates them yet (no aggregation-across-signals logic exists). |
| 4. Engagement | copilot, human approval, response tracking, community reputation controls | Not started. |
| 5. Elite Escape OS Integration | CRM sync, lead lifecycle, quotation status, booking status, lost/won status | Partial — one-directional push (opportunity -> CRM lead) works and is verified end-to-end. The reverse sync (CRM status changes flowing back to the opportunity) does not exist. |
| 6. Revenue Intelligence | revenue attribution, profit attribution, channel/campaign/destination ROI | Not started. |
| 7. Strategy Layer | market trends, trigger events, product recommendations, owner WhatsApp briefs | Not started. |
| 8. Advanced Learning | conversion feedback, adaptive scoring, response-performance learning, forecasting | Not started — the `opportunity_events` table can record feedback labels (`recordFeedback()` exists) but nothing yet reads that data back into the scoring weights. |

## Journeys and lead decay (Phase 2 items, built)

- **Identity & journey resolution** (`source_identities`, `journeys`,
  `journey_signals`): every signal with an author id gets grouped with
  prior signals from the same author on the same platform into one
  journey, tracking the intent progression over time. Deliberately not
  cross-platform identity matching — the client's spec explicitly warns
  against invasive cross-source identity linking. A 30-day gap between
  signals starts a fresh journey rather than reviving a cold one.
  Verified against the client's own example scenario almost verbatim
  ("Japan weather?" → "hotel budget for Tokyo?" → "Japan package, ready
  to book, family of 2") — the journey correctly shows the purchase
  stage progressing research → research → ready_to_buy across all three
  signals, exposed in both the API (`GET /api/journeys`) and a new
  Journeys tab in the dashboard.
- **Lead decay** (spec §12): a real BullMQ repeatable job
  (`MaintenanceService` + `DecayProcessor`) runs every 60 seconds and
  flips any `open` opportunity whose `expiresAt` has passed to `expired`
  — verified by backdating a real opportunity's `expiresAt` and watching
  the scheduled job pick it up and flip its status without any manual
  trigger.

## What Phase 1 actually contains, concretely

- **Database:** 13 Postgres tables via Drizzle — `tenants`, `users`,
  `connectors`, `connector_runs`, `connector_health`, `campaigns`,
  `campaign_sources`, `signals`, `intent_extractions`, `intent_scores`,
  `opportunities`, `opportunity_events`, `audit_events`.
- **Auth:** JWT-based, bootstrap-then-lock self-registration (same pattern
  as the OS platform, for the same privilege-escalation reason), role
  field on users (owner/admin/analyst/reviewer/read_only) — role
  enforcement beyond "owner bypasses everything" is not yet wired into
  individual routes (a real gap, listed below).
- **Connector framework:** a real `SourceConnector` interface
  (healthCheck/complianceMetadata/rateLimitState/fetchNew), one fully
  working implementation (`manual`), two honestly-stubbed implementations
  (`reddit`, `youtube`) that report `disabled`/`down` with a clear reason
  rather than pretending to work.
- **Signal pipeline:** ingest -> normalize -> exact-duplicate check (hash
  of tenant+source+author+text) -> BullMQ job -> deterministic intent
  extraction -> the client's exact weighted scoring rubric (every point
  traceable to a reason) -> 12-type opportunity classification -> stored,
  visible in the dashboard.
- **CRM integration:** verified end-to-end against a real running Elite
  Escape OS instance — a real signal was imported, scored 84/100,
  classified as a premium direct lead, and successfully created lead #8/
  customer #10 in the actual CRM via its public API.
- **Dashboard:** Command Center, Opportunities (list + full score-breakdown
  detail + push-to-CRM + dismiss), Connectors (health status + manual
  health-check trigger), Campaigns (basic CRUD), Import (paste-based
  manual signal entry).

## Known gaps in Phase 1 — fixed in this pass

- ~~**Role enforcement is coarse.**~~ **Fixed.** Every mutating route now
  declares `@Roles(...)`: connector seed/health-check, campaign create/
  status, signal import, and opportunity dismiss/feedback require admin/
  analyst/reviewer; pushing to the real CRM (the spec's own "human
  qualifies" gate) is further restricted to admin/reviewer only. Verified
  with a real `read_only` user: reads succeed (200), writes correctly
  return 403 with a clear "role X cannot perform this action" message —
  a bug in the guard was also fixed along the way, where a role failure
  was being reported as a misleading 401 "invalid token" instead of 403.
- ~~**No admin-log/audit-write path yet.**~~ **Fixed.** `AuditService`
  now writes to `audit_events` on login, bootstrap registration, connector
  creation, and campaign creation. `opportunity_events` remains the
  audit trail for opportunity-specific actions (dismiss/push/feedback),
  which is the more useful record for that entity specifically.
- ~~**Taxonomy is hardcoded**~~ **Fixed.** Destinations, trip types, and
  intent phrases now live in an admin-managed `taxonomy_terms` table
  (`modules/taxonomy/`), seeded from the old hardcoded values on a
  tenant's bootstrap registration — and self-healing for any tenant
  created before this table existed, seeding lazily on first pipeline
  read rather than silently running against an empty vocabulary.
  `common/taxonomy.ts` now holds only structural regex (budget/traveler-
  count/spam/urgency patterns), which isn't realistic for an ops admin
  to edit through a UI. Verified live: added "Vietnam" as a destination
  through the Taxonomy tab with zero code deploy, and a signal mentioning
  it that scored with `destination: null` before the change correctly
  showed `destination: "Vietnam"` (and a 6-point higher score) after.
- **No tests.** Verification so far is curl + Playwright, matching the
  standard used throughout this project, not an automated suite. The
  client's own spec requires unit/integration/E2E/permission tests before
  calling any module production-ready — that work is still ahead.

## Why Phases 2+ weren't attempted in this pass

Building `content_gap`/`product_opportunity` well requires aggregating
patterns *across* many signals over time — that needs real signal volume
to validate against, which doesn't exist yet with zero live connectors
feeding real data. Building the engagement copilot requires the reputation
and compliance guardrails the client explicitly called non-negotiable
("no auto-DM," "human control initially") to be correct on the first try,
not iterated into working. Both are better started once Phase 1's real
gaps above are closed and at least one real connector (Reddit or YouTube,
once credentials exist) is actually feeding the pipeline live data to
learn from.
