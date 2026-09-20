import { Injectable } from "@nestjs/common";
import { ExtractedIntent } from "../intent/intent-extraction.service";
import { ScoreBreakdown } from "../intent/scoring.service";
import { SPAM_PATTERNS } from "../../common/taxonomy";

export type OpportunityType =
  | "direct_lead" | "early_intent" | "b2b_opportunity" | "partnership" | "content_gap"
  | "product_opportunity" | "market_trend" | "customer_support" | "reputation_risk"
  | "competitor_signal" | "spam" | "irrelevant";

export type CommercialClass = "micro" | "standard" | "premium" | "group" | "corporate" | "strategic";

export interface ClassificationResult {
  opportunityType: OpportunityType;
  commercialClass: CommercialClass | null;
  expiresInHours: number | null;
}

/* Rule-based classification (spec §13, §28 Level 1). Not every signal
 * becomes a CRM lead — this is the gate that decides which of the spec's
 * 12 opportunity types a signal actually is. */
@Injectable()
export class OpportunityClassifierService {
  classify(textOriginal: string, intent: ExtractedIntent, score: ScoreBreakdown): ClassificationResult {
    if (SPAM_PATTERNS.some((p) => p.test(textOriginal))) {
      return { opportunityType: "spam", commercialClass: null, expiresInHours: null };
    }

    if (!intent.destination && !intent.tripType) {
      return { opportunityType: "irrelevant", commercialClass: null, expiresInHours: null };
    }

    if (intent.segment === "b2b" || (intent.travelerCountHint ?? 0) > 15) {
      return { opportunityType: "b2b_opportunity", commercialClass: this.commercialClass(intent), expiresInHours: 72 };
    }

    if (intent.purchaseStage === "ready_to_buy" || intent.purchaseStage === "comparison") {
      const expiresInHours = intent.urgency === "high" ? 6 : intent.urgency === "medium" ? 96 : 336;
      return { opportunityType: "direct_lead", commercialClass: this.commercialClass(intent), expiresInHours };
    }

    // Research/discovery/planning with real destination+service data is
    // still commercially useful — just not urgent yet.
    return { opportunityType: "early_intent", commercialClass: this.commercialClass(intent), expiresInHours: 720 };
  }

  private commercialClass(intent: ExtractedIntent): CommercialClass {
    const n = intent.travelerCountHint ?? 1;
    if (n > 15) return "corporate";
    if (n > 6) return "group";
    if (n >= 3) return "premium";
    if (intent.tripType === "visa" && n <= 2) return "standard";
    if (!intent.budgetAedHint && n <= 1) return "micro";
    return "standard";
  }
}
