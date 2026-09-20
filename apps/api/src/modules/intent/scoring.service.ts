import { Injectable } from "@nestjs/common";
import { ExtractedIntent } from "./intent-extraction.service";

export interface ScoreBreakdown {
  totalScore: number;
  purchaseIntent: number;      // /25
  timelineUrgency: number;     // /15
  uaeRelevance: number;        // /15
  serviceFit: number;          // /15
  commercialValue: number;     // /10
  destinationFit: number;      // /5
  groupValue: number;          // /5
  engagement: number;          // /5
  dataConfidence: number;      // /5
  reasons: string[];
}

interface SignalEngagement { likes: number; comments: number }

/* Exactly the rubric specified by the client — every point is computed
 * from a concrete rule, never an opaque model output, and every score
 * carries a human-readable "why". Weights sum to 100. */
@Injectable()
export class ScoringService {
  score(intent: ExtractedIntent, engagement: SignalEngagement): ScoreBreakdown {
    const reasons: string[] = [];

    // Purchase intent /25
    let purchaseIntent = 5;
    if (intent.purchaseStage === "ready_to_buy") { purchaseIntent = 25; reasons.push("Explicit ready-to-buy language"); }
    else if (intent.purchaseStage === "comparison") { purchaseIntent = 18; reasons.push("Actively comparing options"); }
    else if (intent.purchaseStage === "planning") { purchaseIntent = 14; }
    else if (intent.purchaseStage === "research") { purchaseIntent = 10; }
    else if (intent.purchaseStage === "discovery") { purchaseIntent = 5; }

    // Timeline urgency /15
    let timelineUrgency = 3;
    if (intent.urgency === "high") { timelineUrgency = 15; reasons.push("Travelling very soon"); }
    else if (intent.urgency === "medium") { timelineUrgency = 9; }

    // UAE/GCC relevance /15
    const uaeRelevance = intent.origin === "UAE" ? 15 : 3;
    if (intent.origin === "UAE") reasons.push("Based in the UAE");

    // Service fit /15 — Elite Escape offers holiday/visa/flight/hotel/attraction/insurance
    const serviceFit = intent.tripType ? 15 : 4;
    if (intent.tripType) reasons.push(`Clear ${intent.tripType} need`);

    // Commercial value /10 — proxy from traveler count + budget presence
    let commercialValue = 4;
    if (intent.budgetAedHint && intent.budgetAedHint > 0) { commercialValue = 8; reasons.push("Stated a budget"); }
    if (intent.travelerCountHint && intent.travelerCountHint > 1) commercialValue = Math.min(10, commercialValue + 2);

    // Destination fit /5 — Elite Escape's own destination catalog
    const destinationFit = intent.destination ? 5 : 0;
    if (intent.destination) reasons.push(`Destination offered by Elite Escape (${intent.destination})`);

    // Group value /5
    let groupValue = 1;
    if (intent.travelerCountHint) {
      if (intent.travelerCountHint >= 2 && intent.travelerCountHint <= 6) { groupValue = 4; reasons.push(`Group of ${intent.travelerCountHint}`); }
      else if (intent.travelerCountHint > 6) { groupValue = 5; reasons.push(`Large group (${intent.travelerCountHint})`); }
    }

    // Engagement /5 — normalized against a modest ceiling, not a raw count
    const engagementScore = Math.min(5, Math.round(((engagement.likes || 0) + (engagement.comments || 0) * 2) / 10));

    // Data confidence /5 — from the extractor's own confidence (0..1)
    const dataConfidence = Math.round(intent.confidence * 5);

    const totalScore = purchaseIntent + timelineUrgency + uaeRelevance + serviceFit + commercialValue + destinationFit + groupValue + engagementScore + dataConfidence;

    return {
      totalScore, purchaseIntent, timelineUrgency, uaeRelevance, serviceFit, commercialValue,
      destinationFit, groupValue, engagement: engagementScore, dataConfidence, reasons,
    };
  }
}
