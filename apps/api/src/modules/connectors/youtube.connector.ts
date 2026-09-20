import { Injectable } from "@nestjs/common";
import { ComplianceMetadata, RateLimitState, RawSignalInput, SourceConnector } from "./connector.interface";

/* Same honesty pattern as RedditConnector — YouTube Data API v3 is the
 * ToS-compliant path (comments/search via official API), but needs a
 * Google Cloud project + API key this environment doesn't have. */
@Injectable()
export class YoutubeConnector implements SourceConnector {
  readonly source = "youtube";

  async healthCheck() {
    if (!process.env.YOUTUBE_API_KEY) {
      return { healthy: false, message: "YOUTUBE_API_KEY not configured — connector is registered but not authenticated" };
    }
    return { healthy: true };
  }

  complianceMetadata(): ComplianceMetadata {
    return {
      accessType: "official_api",
      commercialUseStatus: "requires_review",
      productionLevel: "disabled",
      notes: "YouTube Data API v3 key not yet provisioned. Official API only.",
    };
  }

  async rateLimitState(): Promise<RateLimitState> {
    return { remaining: null, resetAt: null };
  }

  async fetchNew(_config: Record<string, unknown>): Promise<RawSignalInput[]> {
    throw new Error("YoutubeConnector.fetchNew: not implemented — requires YOUTUBE_API_KEY");
  }
}
