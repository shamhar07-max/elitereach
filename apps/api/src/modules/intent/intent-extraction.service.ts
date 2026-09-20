import { Injectable } from "@nestjs/common";
import {
  HIGH_URGENCY_PATTERNS, MEDIUM_URGENCY_PATTERNS,
  GROUP_SIZE_PATTERN, FAMILY_OF_PATTERN, BUDGET_AED_PATTERN, BUDGET_DOLLAR_PATTERN,
} from "../../common/taxonomy";
import { ResolvedTaxonomy } from "../taxonomy/taxonomy.service";

export interface ExtractedIntent {
  origin: string | null;
  destination: string | null;
  tripType: string | null;
  travelerCountHint: number | null;
  budgetAedHint: number | null;
  purchaseStage: "discovery" | "research" | "planning" | "comparison" | "ready_to_buy" | "after_purchase";
  urgency: "low" | "medium" | "high";
  segment: "d2c" | "b2b";
  confidence: number;
}

/* Level 1 — deterministic rules only (spec §28). No LLM call anywhere in
 * this file. The business vocabulary (destinations, trip types, intent
 * phrases) is now admin-managed and passed in per-tenant by the caller
 * (see TaxonomyService) rather than imported as static constants — only
 * the structural regex patterns (budget/traveler-count/spam/urgency) stay
 * hardcoded, since those aren't realistic for an ops admin to edit. */
@Injectable()
export class IntentExtractionService {
  extract(textNormalized: string, taxonomy: ResolvedTaxonomy): ExtractedIntent {
    const t = textNormalized.toLowerCase();
    let hits = 0;

    const destination = this.findDestination(t, taxonomy.destinationAliases);
    if (destination) hits++;

    const origin = taxonomy.originKeywords.some((k) => t.includes(k)) ? "UAE" : null;
    if (origin) hits++;

    const tripType = this.findTripType(t, taxonomy.tripTypeKeywords);
    if (tripType) hits++;

    const travelerCountHint = this.findTravelerCount(t);
    if (travelerCountHint) hits++;

    const budgetAedHint = this.findBudgetAed(t);
    if (budgetAedHint) hits++;

    const purchaseStage = this.classifyStage(t, taxonomy);
    const urgency = this.classifyUrgency(t);
    const segment = travelerCountHint && travelerCountHint > 15 ? "b2b" : "d2c";

    const confidence = Math.min(1, hits / 4);

    return { origin, destination, tripType, travelerCountHint, budgetAedHint, purchaseStage, urgency, segment, confidence };
  }

  private findDestination(t: string, destinationAliases: Record<string, string>): string | null {
    for (const [alias, canonical] of Object.entries(destinationAliases)) {
      if (t.includes(alias)) return canonical;
    }
    return null;
  }

  private findTripType(t: string, tripTypeKeywords: Record<string, string[]>): string | null {
    for (const [type, keywords] of Object.entries(tripTypeKeywords)) {
      if (keywords.some((k) => t.includes(k))) return type;
    }
    return null;
  }

  private findTravelerCount(t: string): number | null {
    const familyMatch = t.match(FAMILY_OF_PATTERN);
    if (familyMatch) return parseInt(familyMatch[1], 10);
    const groupMatch = t.match(GROUP_SIZE_PATTERN);
    if (groupMatch) return parseInt(groupMatch[1], 10);
    return null;
  }

  private findBudgetAed(t: string): number | null {
    const aedMatch = t.match(BUDGET_AED_PATTERN);
    if (aedMatch) return parseInt(aedMatch[1].replace(/,/g, ""), 10);
    const dollarMatch = t.match(BUDGET_DOLLAR_PATTERN);
    if (dollarMatch) return Math.round(parseInt(dollarMatch[1].replace(/,/g, ""), 10) * 3.67); // rough USD->AED
    return null;
  }

  private classifyStage(t: string, taxonomy: ResolvedTaxonomy): ExtractedIntent["purchaseStage"] {
    if (taxonomy.readyToBuyPhrases.some((p) => t.includes(p))) return "ready_to_buy";
    if (taxonomy.comparisonPhrases.some((p) => t.includes(p))) return "comparison";
    if (taxonomy.discoveryPhrases.some((p) => t.includes(p))) return "discovery";
    return "research";
  }

  private classifyUrgency(t: string): ExtractedIntent["urgency"] {
    if (HIGH_URGENCY_PATTERNS.some((p) => p.test(t))) return "high";
    if (MEDIUM_URGENCY_PATTERNS.some((p) => p.test(t))) return "medium";
    return "low";
  }
}
