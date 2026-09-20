import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { DB } from "../../db/db.module";
import type { Db } from "../../db/client";
import { opportunities, signals, intentExtractions, intentScores, opportunityEvents, journeySignals, journeys } from "../../db/schema";

@Injectable()
export class OpportunitiesService {
  constructor(@Inject(DB) private db: Db) {}

  async list(tenantId: number, status?: string) {
    const conditions = status ? and(eq(opportunities.tenantId, tenantId), eq(opportunities.status, status)) : eq(opportunities.tenantId, tenantId);
    return this.db.select({
      id: opportunities.id, opportunityType: opportunities.opportunityType, commercialClass: opportunities.commercialClass,
      status: opportunities.status, expiresAt: opportunities.expiresAt, crmLeadId: opportunities.crmLeadId,
      createdAt: opportunities.createdAt,
      signalText: signals.textOriginal, source: signals.source, sourceUrl: signals.sourceUrl,
      destination: intentExtractions.destination, tripType: intentExtractions.tripType, purchaseStage: intentExtractions.purchaseStage,
      totalScore: intentScores.totalScore,
    }).from(opportunities)
      .innerJoin(signals, eq(signals.id, opportunities.signalId))
      .leftJoin(intentExtractions, eq(intentExtractions.signalId, signals.id))
      .leftJoin(intentScores, eq(intentScores.signalId, signals.id))
      .where(conditions)
      .orderBy(desc(intentScores.totalScore));
  }

  async getDetail(tenantId: number, id: number) {
    const [opp] = await this.db.select().from(opportunities).where(and(eq(opportunities.id, id), eq(opportunities.tenantId, tenantId))).limit(1);
    if (!opp) throw new NotFoundException("opportunity not found");

    const [signal] = await this.db.select().from(signals).where(eq(signals.id, opp.signalId)).limit(1);
    const [intent] = await this.db.select().from(intentExtractions).where(eq(intentExtractions.signalId, opp.signalId)).limit(1);
    const [score] = await this.db.select().from(intentScores).where(eq(intentScores.signalId, opp.signalId)).limit(1);
    const events = await this.db.select().from(opportunityEvents).where(eq(opportunityEvents.opportunityId, opp.id)).orderBy(desc(opportunityEvents.createdAt));

    const [journeyLink] = await this.db.select({
      journeyId: journeySignals.journeyId, sequenceNumber: journeySignals.sequenceNumber, signalCount: journeys.signalCount,
    }).from(journeySignals)
      .innerJoin(journeys, eq(journeys.id, journeySignals.journeyId))
      .where(eq(journeySignals.signalId, opp.signalId)).limit(1);

    return { ...opp, signal, intent, score, events, journey: journeyLink || null };
  }

  async dismiss(tenantId: number, id: number, actorUserId: number) {
    const [row] = await this.db.update(opportunities).set({ status: "dismissed", updatedAt: new Date() })
      .where(and(eq(opportunities.id, id), eq(opportunities.tenantId, tenantId))).returning();
    if (!row) throw new NotFoundException("opportunity not found");
    await this.db.insert(opportunityEvents).values({ opportunityId: id, event: "dismissed", actorUserId });
    return row;
  }

  async recordFeedback(id: number, actorUserId: number, label: string) {
    await this.db.insert(opportunityEvents).values({ opportunityId: id, event: `feedback:${label}`, actorUserId });
    return { ok: true };
  }
}
