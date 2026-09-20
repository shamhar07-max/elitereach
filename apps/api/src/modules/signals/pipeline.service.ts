import { Inject, Injectable, Logger } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DB } from "../../db/db.module";
import type { Db } from "../../db/client";
import { signals, intentExtractions, intentScores, opportunities } from "../../db/schema";
import { IntentExtractionService } from "../intent/intent-extraction.service";
import { ScoringService } from "../intent/scoring.service";
import { OpportunityClassifierService } from "../opportunities/opportunity-classifier.service";
import { JourneysService } from "../journeys/journeys.service";
import { TaxonomyService } from "../taxonomy/taxonomy.service";

/* The pipeline diagram from the spec:
 *
 *   signal (pending) -> normalize (done at ingest) -> intent extraction
 *   -> scoring -> opportunity classification -> identity/journey
 *   resolution -> signal (classified)
 *
 * Identity/journey resolution (Phase 2) now runs here too — it's cheap,
 * deterministic DB work with no AI dependency, so there was no reason to
 * hold it for a separate pass once the tables existed.
 */
@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    @Inject(DB) private db: Db,
    private intentExtraction: IntentExtractionService,
    private scoring: ScoringService,
    private classifier: OpportunityClassifierService,
    private journeys: JourneysService,
    private taxonomyService: TaxonomyService,
  ) {}

  async processSignal(signalId: number) {
    const [signal] = await this.db.select().from(signals).where(eq(signals.id, signalId)).limit(1);
    if (!signal) { this.logger.warn(`processSignal: signal ${signalId} not found`); return; }

    const taxonomy = await this.taxonomyService.getForTenant(signal.tenantId);
    const intent = this.intentExtraction.extract(signal.textNormalized, taxonomy);
    await this.db.insert(intentExtractions).values({
      signalId: signal.id, origin: intent.origin, destination: intent.destination, tripType: intent.tripType,
      travelerCountHint: intent.travelerCountHint, budgetAedHint: intent.budgetAedHint,
      purchaseStage: intent.purchaseStage, urgency: intent.urgency, segment: intent.segment,
      confidence: intent.confidence, extractionMethod: "rule_v1",
    }).onConflictDoNothing();

    const score = this.scoring.score(intent, { likes: signal.engagementLikes || 0, comments: signal.engagementComments || 0 });
    await this.db.insert(intentScores).values({
      signalId: signal.id, totalScore: score.totalScore, purchaseIntent: score.purchaseIntent,
      timelineUrgency: score.timelineUrgency, uaeRelevance: score.uaeRelevance, serviceFit: score.serviceFit,
      commercialValue: score.commercialValue, destinationFit: score.destinationFit, groupValue: score.groupValue,
      engagement: score.engagement, dataConfidence: score.dataConfidence, reasons: score.reasons, scoringVersion: "v1",
    }).onConflictDoNothing();

    const classification = this.classifier.classify(signal.textOriginal, intent, score);
    const expiresAt = classification.expiresInHours ? new Date(Date.now() + classification.expiresInHours * 3600_000) : null;

    await this.db.insert(opportunities).values({
      tenantId: signal.tenantId, signalId: signal.id, opportunityType: classification.opportunityType,
      commercialClass: classification.commercialClass, expiresAt, status: "open",
    }).onConflictDoNothing();

    const journeyId = await this.journeys.attachSignal(
      signal.tenantId, signal.source, signal.authorExternalId, signal.authorDisplayName, signal.id, intent,
    );

    await this.db.update(signals).set({ processingStatus: "classified" }).where(eq(signals.id, signal.id));

    return { signalId: signal.id, intent, score, classification, journeyId };
  }
}
