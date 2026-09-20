# Elite Reach — Build Plan

Reproduces the client's own 8-phase plan and records exactly what's built.

| Phase | Scope (client's own words) | Status |
|---|---|---|
| **1. Production foundation** | PostgreSQL, authentication, permissions, connector framework, campaign management, signal ingestion, normalized storage, deduplication, existing rule scoring | **Done.** See below for specifics. |
| 2. Intent Intelligence | intent taxonomy, structured extraction, journeys, priority scoring, commercial classification, lead decay, AI evaluation dataset | Not started. Phase 1 already has basic structured extraction + scoring + commercial classification (needed for opportunities to be usable at all) — journeys (linking multiple signals from the same person over time) and true lead decay (a scheduled job that recalculates priority as `expiresAt` approaches) are the parts still missing. |
| 3. Opportunity Intelligence | content gaps, product opportunities, B2B, partnerships, reputation, competitor signals | Partial — the classifier already distinguishes `direct_lead`/`b2b_opportunity`/`spam`/`irrelevant`/`early_intent`; `content_gap`, `product_opportunity`, `partnership`, `reputation_risk`, and `competitor_signal` are classified as a type in the enum but nothing populates them yet (no aggregation-across-signals logic exists). |
| 4. Engagement | copilot, human approval, response tracking, community reputation controls | Not started. |
| 5. Elite Escape OS Integration | CRM sync, lead lifecycle, quotation status, booking status, lost/won status | Partial — one-directional push (opportunity -> CRM lead) works and is verified end-to-end. The reverse sync (CRM status changes flowing back to the opportunity) does not exist. |
| 6. Revenue Intelligence | revenue attribution, profit attribution, channel/campaign/destination ROI | Not started. |
| 7. Strategy Layer | market trends, trigger events, product recommendations, owner WhatsApp briefs | Not started. |
| 8. Advanced Learning | conversion feedback, adaptive scoring, response-performance learning, forecasting | Not started — the `opportunity_events` table can record feedback labels (`recordFeedback()` exists) but nothing yet reads that data back into the scoring weights. |

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

## Known gaps in Phase 1 itself (not deferred to later phases)

- **Role enforcement is coarse.** The JWT guard checks `role !== "owner"`
  against a route's declared allowed roles, but no route in Phase 1
  actually declares `@Roles(...)` restrictions yet — every authenticated
  user can currently do everything an owner can. This needs fixing before
  a second real user (not just the bootstrap owner) is added.
- **No admin-log/audit-write path yet.** The `audit_events` table exists
  in the schema but nothing writes to it — `opportunity_events` captures
  Reach-specific actions (dismiss/push/feedback), but login, connector
  changes, and campaign changes aren't recorded anywhere.
- **Taxonomy is hardcoded**, not the admin-managed table the client's
  full spec describes (`common/taxonomy.ts` — destinations, trip types,
  phrase lists). This is the deliberate Phase 1 shortcut: a real taxonomy
  admin UI is meaningful work in its own right and wasn't asked for yet.
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
