import {
  pgTable, serial, text, integer, boolean, timestamp, jsonb, real, uniqueIndex, index, pgEnum,
} from "drizzle-orm/pg-core";

/* Phase 1 — Production Foundation only (per the client's own phased build
 * plan). Deliberately excludes: journeys/identity-resolution (Phase 2),
 * content-gap/product-opportunity/trigger tables (Phase 3),
 * engagement/reputation tables (Phase 4), revenue-attribution tables
 * (Phase 6), and ai_runs/ai_feedback/model_versions (Phase 8 — no AI/NLP
 * is used yet; Phase 1 scoring is deterministic/rule-based only). */

// ===== Tenancy & access =====
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const roleEnum = pgEnum("role", ["owner", "admin", "analyst", "reviewer", "read_only"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: roleEnum("role").notNull().default("analyst"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  emailPerTenant: uniqueIndex("users_tenant_email_idx").on(t.tenantId, t.email),
}));

// ===== Connector framework =====
// productionLevel is the honesty field the client's spec calls out
// explicitly: never claim a connector is more reliable than it is.
export const productionLevelEnum = pgEnum("production_level", ["production", "beta", "experimental", "disabled"]);
export const accessTypeEnum = pgEnum("access_type", ["official_api", "manual_import", "rss", "other"]);

export const connectors = pgTable("connectors", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  source: text("source").notNull(), // 'manual', 'reddit', 'youtube', ...
  accessType: accessTypeEnum("access_type").notNull(),
  commercialUseStatus: text("commercial_use_status").notNull().default("requires_review"), // 'approved' | 'requires_review'
  productionLevel: productionLevelEnum("production_level").notNull().default("experimental"),
  config: jsonb("config").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const connectorRuns = pgTable("connector_runs", {
  id: serial("id").primaryKey(),
  connectorId: integer("connector_id").notNull().references(() => connectors.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
  status: text("status").notNull().default("running"), // 'running' | 'succeeded' | 'failed'
  signalsIngested: integer("signals_ingested").notNull().default(0),
  errorMessage: text("error_message"),
}, (t) => ({ byConnector: index("connector_runs_connector_idx").on(t.connectorId) }));

// Denormalized "current health" snapshot per connector — cheap to read for
// a dashboard without scanning connector_runs every time.
export const connectorHealth = pgTable("connector_health", {
  connectorId: integer("connector_id").primaryKey().references(() => connectors.id, { onDelete: "cascade" }),
  health: text("health").notNull().default("unknown"), // 'healthy' | 'degraded' | 'down' | 'unknown'
  lastSuccessfulRunAt: timestamp("last_successful_run_at"),
  lastErrorAt: timestamp("last_error_at"),
  lastErrorMessage: text("last_error_message"),
  rateLimitRemaining: integer("rate_limit_remaining"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ===== Campaigns (what to look for, not what to send) =====
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  status: text("status").notNull().default("draft"), // 'draft' | 'active' | 'paused' | 'ended'
  objective: text("objective"),
  destinations: jsonb("destinations").notNull().default([]),
  originLocations: jsonb("origin_locations").notNull().default([]),
  services: jsonb("services").notNull().default([]),
  keywords: jsonb("keywords").notNull().default([]),
  dailyLimit: integer("daily_limit"),
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
  ownerUserId: integer("owner_user_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const campaignSources = pgTable("campaign_sources", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  connectorId: integer("connector_id").notNull().references(() => connectors.id),
});

// ===== Signals (raw, preserved) =====
export const signals = pgTable("signals", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  connectorId: integer("connector_id").notNull().references(() => connectors.id),
  campaignId: integer("campaign_id").references(() => campaigns.id),
  source: text("source").notNull(),
  sourceRecordId: text("source_record_id").notNull(),
  sourceUrl: text("source_url"),
  sourceThreadId: text("source_thread_id"),
  authorExternalId: text("author_external_id"),
  authorDisplayName: text("author_display_name"),
  publishedAt: timestamp("published_at"),
  collectedAt: timestamp("collected_at").notNull().defaultNow(),
  language: text("language"),
  textOriginal: text("text_original").notNull(),
  textNormalized: text("text_normalized").notNull(),
  engagementLikes: integer("engagement_likes").default(0),
  engagementComments: integer("engagement_comments").default(0),
  locationHint: text("location_hint"),
  sourceAccessClass: text("source_access_class").notNull(), // mirrors connector.accessType at ingest time
  rawPayloadHash: text("raw_payload_hash").notNull(),
  dedupeHash: text("dedupe_hash").notNull(), // hash(source + author + normalized text) — exact-duplicate detection
  processingStatus: text("processing_status").notNull().default("pending"), // pending -> processed -> scored -> classified
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  dedupeIdx: uniqueIndex("signals_dedupe_idx").on(t.tenantId, t.dedupeHash),
  byTenant: index("signals_tenant_idx").on(t.tenantId),
  byStatus: index("signals_status_idx").on(t.processingStatus),
}));

// ===== Deterministic intent extraction (Level 1 — no AI yet) =====
export const intentExtractions = pgTable("intent_extractions", {
  id: serial("id").primaryKey(),
  signalId: integer("signal_id").notNull().references(() => signals.id, { onDelete: "cascade" }),
  origin: text("origin"),
  destination: text("destination"),
  tripType: text("trip_type"), // 'holiday' | 'visa' | 'flight' | 'hotel' | 'attraction' | 'insurance' | null
  travelerCountHint: integer("traveler_count_hint"),
  budgetAedHint: real("budget_aed_hint"),
  purchaseStage: text("purchase_stage"), // discovery|research|planning|comparison|ready_to_buy|after_purchase
  urgency: text("urgency"), // low|medium|high
  segment: text("segment").notNull().default("d2c"), // 'd2c' | 'b2b'
  confidence: real("confidence").notNull().default(0), // 0..1, deterministic-rule confidence
  extractionMethod: text("extraction_method").notNull().default("rule_v1"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ bySignal: uniqueIndex("intent_extractions_signal_idx").on(t.signalId) }));

// ===== Scoring (transparent, weighted, always explained) =====
export const intentScores = pgTable("intent_scores", {
  id: serial("id").primaryKey(),
  signalId: integer("signal_id").notNull().references(() => signals.id, { onDelete: "cascade" }),
  totalScore: integer("total_score").notNull(),
  purchaseIntent: integer("purchase_intent").notNull(),
  timelineUrgency: integer("timeline_urgency").notNull(),
  uaeRelevance: integer("uae_relevance").notNull(),
  serviceFit: integer("service_fit").notNull(),
  commercialValue: integer("commercial_value").notNull(),
  destinationFit: integer("destination_fit").notNull(),
  groupValue: integer("group_value").notNull(),
  engagement: integer("engagement").notNull(),
  dataConfidence: integer("data_confidence").notNull(),
  reasons: jsonb("reasons").notNull().default([]), // string[] — human-readable "why prioritized"
  scoringVersion: text("scoring_version").notNull().default("v1"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ bySignal: uniqueIndex("intent_scores_signal_idx").on(t.signalId) }));

// ===== Opportunity classification =====
export const opportunityTypeEnum = pgEnum("opportunity_type", [
  "direct_lead", "early_intent", "b2b_opportunity", "partnership", "content_gap",
  "product_opportunity", "market_trend", "customer_support", "reputation_risk",
  "competitor_signal", "spam", "irrelevant",
]);
export const commercialClassEnum = pgEnum("commercial_class", ["micro", "standard", "premium", "group", "corporate", "strategic"]);

export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  signalId: integer("signal_id").notNull().references(() => signals.id, { onDelete: "cascade" }),
  opportunityType: opportunityTypeEnum("opportunity_type").notNull(),
  commercialClass: commercialClassEnum("commercial_class"),
  priorityDecayAt: timestamp("priority_decay_at"), // when urgency drops a tier
  expiresAt: timestamp("expires_at"), // when this opportunity is effectively dead
  status: text("status").notNull().default("open"), // open | pushed_to_crm | dismissed | expired
  crmLeadId: integer("crm_lead_id"), // id in Elite Escape OS, once pushed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  bySignal: uniqueIndex("opportunities_signal_idx").on(t.signalId),
  byStatus: index("opportunities_status_idx").on(t.status),
  byType: index("opportunities_type_idx").on(t.opportunityType),
}));

export const opportunityEvents = pgTable("opportunity_events", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id").notNull().references(() => opportunities.id, { onDelete: "cascade" }),
  event: text("event").notNull(), // 'created' | 'pushed_to_crm' | 'dismissed' | 'feedback:*'
  actorUserId: integer("actor_user_id").references(() => users.id),
  detail: text("detail"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ===== Audit =====
export const auditEvents = pgTable("audit_events", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  actorUserId: integer("actor_user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  detail: text("detail"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
