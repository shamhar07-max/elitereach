import { Injectable } from "@nestjs/common";
import { ComplianceMetadata, RateLimitState, RawSignalInput, SourceConnector } from "./connector.interface";

/* Honest stub. Reddit's official API is a legitimate, ToS-compliant path
 * (this is exactly the kind of "official_api" access the client's own
 * governance rules require — no scraping, no login-wall circumvention),
 * but it requires a registered Reddit app (client ID/secret) this
 * environment doesn't have. healthCheck() reports this truthfully rather
 * than pretending to work — per the client's own instruction not to treat
 * every connector as equally reliable. */
@Injectable()
export class RedditConnector implements SourceConnector {
  readonly source = "reddit";

  async healthCheck() {
    if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
      return { healthy: false, message: "REDDIT_CLIENT_ID/REDDIT_CLIENT_SECRET not configured — connector is registered but not authenticated" };
    }
    return { healthy: true };
  }

  complianceMetadata(): ComplianceMetadata {
    return {
      accessType: "official_api",
      commercialUseStatus: "requires_review",
      productionLevel: "disabled",
      notes: "Reddit API app not yet registered. Official OAuth2 API only — no scraping.",
    };
  }

  async rateLimitState(): Promise<RateLimitState> {
    return { remaining: null, resetAt: null };
  }

  async fetchNew(_config: Record<string, unknown>): Promise<RawSignalInput[]> {
    throw new Error("RedditConnector.fetchNew: not implemented — requires REDDIT_CLIENT_ID/REDDIT_CLIENT_SECRET");
  }
}
