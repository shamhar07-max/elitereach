/* Every source connector implements this shape (spec §4). Phase 1 ships
 * exactly one fully-working connector (manual import) and two honestly-
 * labeled stubs (reddit, youtube) — see connectors.seed.ts. Wiring a real
 * Reddit/YouTube connector needs API credentials this environment doesn't
 * have; the interface and health-tracking plumbing are real and ready for
 * when those credentials exist. */

export interface ComplianceMetadata {
  accessType: "official_api" | "manual_import" | "rss" | "other";
  commercialUseStatus: "approved" | "requires_review";
  productionLevel: "production" | "beta" | "experimental" | "disabled";
  notes?: string;
}

export interface RateLimitState {
  remaining: number | null;
  resetAt: Date | null;
}

export interface RawSignalInput {
  sourceRecordId: string;
  sourceUrl?: string;
  sourceThreadId?: string;
  authorExternalId?: string;
  authorDisplayName?: string;
  publishedAt?: Date;
  language?: string;
  text: string;
  engagementLikes?: number;
  engagementComments?: number;
  locationHint?: string;
}

export interface SourceConnector {
  readonly source: string;
  healthCheck(): Promise<{ healthy: boolean; message?: string }>;
  complianceMetadata(): ComplianceMetadata;
  rateLimitState(): Promise<RateLimitState>;
  /** Returns whatever new raw signals this connector can produce right now.
   * For manual import, this is the batch handed to ingest(); for a real
   * API-backed connector, this is where the API call would happen. */
  fetchNew(config: Record<string, unknown>): Promise<RawSignalInput[]>;
}
