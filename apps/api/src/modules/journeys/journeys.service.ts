import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, desc, lt } from "drizzle-orm";
import { DB } from "../../db/db.module";
import type { Db } from "../../db/client";
import { sourceIdentities, journeys, journeySignals, signals, intentExtractions } from "../../db/schema";
import { ExtractedIntent } from "../intent/intent-extraction.service";

// A gap of more than this many days between two signals from the same
// author starts a NEW journey rather than continuing the old one — an
// old, cold conversation shouldn't silently absorb an unrelated new one.
const JOURNEY_GAP_DAYS = 30;

@Injectable()
export class JourneysService {
  constructor(@Inject(DB) private db: Db) {}

  /** Resolves (or creates) the identity for this author on this source,
   * finds or opens an active journey for them, and attaches the signal to
   * it. No-ops (returns null) when the signal has no author id — an
   * anonymous or author-less signal can't be journeyed. */
  async attachSignal(tenantId: number, source: string, authorExternalId: string | null, authorDisplayName: string | null, signalId: number, intent: ExtractedIntent) {
    if (!authorExternalId) return null;

    const [identity] = await this.db.insert(sourceIdentities)
      .values({ tenantId, source, authorExternalId, authorDisplayName: authorDisplayName ?? undefined })
      .onConflictDoUpdate({
        target: [sourceIdentities.tenantId, sourceIdentities.source, sourceIdentities.authorExternalId],
        set: { lastSeenAt: new Date(), authorDisplayName: authorDisplayName ?? undefined },
      })
      .returning();

    const gapCutoff = new Date(Date.now() - JOURNEY_GAP_DAYS * 86400_000);
    const [existingJourney] = await this.db.select().from(journeys)
      .where(and(eq(journeys.sourceIdentityId, identity.id), eq(journeys.status, "active")))
      .orderBy(desc(journeys.lastSignalAt)).limit(1);

    const journey = existingJourney && existingJourney.lastSignalAt > gapCutoff
      ? existingJourney
      : (await this.db.insert(journeys).values({ tenantId, sourceIdentityId: identity.id }).returning())[0];

    await this.db.update(journeys).set({
      lastSignalAt: new Date(),
      signalCount: journey.signalCount + 1,
      latestPurchaseStage: intent.purchaseStage,
      latestUrgency: intent.urgency,
    }).where(eq(journeys.id, journey.id));

    await this.db.insert(journeySignals).values({
      journeyId: journey.id, signalId, sequenceNumber: journey.signalCount + 1,
    }).onConflictDoNothing();

    return journey.id;
  }

  async list(tenantId: number) {
    return this.db.select({
      id: journeys.id, status: journeys.status, latestPurchaseStage: journeys.latestPurchaseStage,
      latestUrgency: journeys.latestUrgency, signalCount: journeys.signalCount,
      startedAt: journeys.startedAt, lastSignalAt: journeys.lastSignalAt,
      source: sourceIdentities.source, authorDisplayName: sourceIdentities.authorDisplayName,
      authorExternalId: sourceIdentities.authorExternalId,
    }).from(journeys)
      .innerJoin(sourceIdentities, eq(sourceIdentities.id, journeys.sourceIdentityId))
      .where(and(eq(journeys.tenantId, tenantId)))
      .orderBy(desc(journeys.lastSignalAt));
  }

  async getDetail(tenantId: number, id: number) {
    const [journey] = await this.db.select().from(journeys).where(and(eq(journeys.id, id), eq(journeys.tenantId, tenantId))).limit(1);
    if (!journey) throw new NotFoundException("journey not found");
    const [identity] = await this.db.select().from(sourceIdentities).where(eq(sourceIdentities.id, journey.sourceIdentityId)).limit(1);

    const timeline = await this.db.select({
      sequenceNumber: journeySignals.sequenceNumber, signalId: signals.id, text: signals.textOriginal,
      sourceUrl: signals.sourceUrl, collectedAt: signals.collectedAt,
      purchaseStage: intentExtractions.purchaseStage, destination: intentExtractions.destination,
    }).from(journeySignals)
      .innerJoin(signals, eq(signals.id, journeySignals.signalId))
      .leftJoin(intentExtractions, eq(intentExtractions.signalId, signals.id))
      .where(eq(journeySignals.journeyId, id))
      .orderBy(journeySignals.sequenceNumber);

    return { ...journey, identity, timeline };
  }
}
