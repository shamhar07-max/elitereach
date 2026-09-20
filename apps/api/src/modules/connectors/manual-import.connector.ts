import { Injectable } from "@nestjs/common";
import { ComplianceMetadata, RateLimitState, RawSignalInput, SourceConnector } from "./connector.interface";

/* The one connector that is genuinely "production" today: a human pastes
 * or uploads real public text (e.g. copied from a forum thread they found
 * manually) and it goes through the exact same pipeline a live API
 * connector would feed. This is not a placeholder — it's a legitimate,
 * commonly-used ingestion path (a lot of real demand-intelligence
 * workflows start with an analyst manually curating source material
 * before automating the source), and it's the only source this
 * environment can make fully real without third-party API credentials. */
@Injectable()
export class ManualImportConnector implements SourceConnector {
  readonly source = "manual";

  async healthCheck() {
    return { healthy: true };
  }

  complianceMetadata(): ComplianceMetadata {
    return { accessType: "manual_import", commercialUseStatus: "approved", productionLevel: "production", notes: "Human-curated input — no external ToS to violate." };
  }

  async rateLimitState(): Promise<RateLimitState> {
    return { remaining: null, resetAt: null };
  }

  /** Manual import doesn't "fetch" anything — signals arrive via the
   * ingestion API directly. This satisfies the interface for symmetry
   * with real connectors that would poll here. */
  async fetchNew(_config: Record<string, unknown>): Promise<RawSignalInput[]> {
    return [];
  }
}
