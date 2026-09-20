import { Inject, Injectable, BadRequestException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DB } from "../../db/db.module";
import type { Db } from "../../db/client";
import { opportunities, signals, intentExtractions, intentScores, opportunityEvents } from "../../db/schema";

const CRM_BASE_URL = process.env.ELITE_ESCAPE_OS_URL || "http://localhost:4100";

const TRIP_TYPE_TO_INTEREST: Record<string, string> = {
  holiday: "holiday", visa: "visa", flight: "flight", hotel: "hotel", attraction: "attraction", insurance: "insurance",
};

/* The one real cross-system integration in this Phase 1 build: pushing a
 * human-qualified opportunity into the actual Elite Escape OS CRM via its
 * existing public leads endpoint. Deliberately does NOT fabricate a
 * customer identity — no phone/email exists for an anonymous public
 * signal, and the client's own governance rules forbid harvesting public
 * contact info into marketing lists. Instead this creates a work-item
 * lead a human reviews and follows up on manually (the spec's own
 * "Reach Opportunity -> Human qualifies -> createLead()" sequence — the
 * qualification is the reviewer choosing to push it at all). */
@Injectable()
export class CrmSyncService {
  constructor(@Inject(DB) private db: Db) {}

  async pushToCrm(tenantId: number, opportunityId: number, actorUserId: number) {
    const [opp] = await this.db.select().from(opportunities).where(eq(opportunities.id, opportunityId)).limit(1);
    if (!opp || opp.tenantId !== tenantId) throw new BadRequestException("opportunity not found");
    if (opp.status === "pushed_to_crm") throw new BadRequestException("already pushed to CRM");
    if (opp.opportunityType === "spam" || opp.opportunityType === "irrelevant") {
      throw new BadRequestException(`refusing to push a "${opp.opportunityType}" opportunity to CRM`);
    }

    const [signal] = await this.db.select().from(signals).where(eq(signals.id, opp.signalId)).limit(1);
    const [intent] = await this.db.select().from(intentExtractions).where(eq(intentExtractions.signalId, opp.signalId)).limit(1);
    const [score] = await this.db.select().from(intentScores).where(eq(intentScores.signalId, opp.signalId)).limit(1);

    const interestType = (intent?.tripType && TRIP_TYPE_TO_INTEREST[intent.tripType]) || "general";
    const reasons = (score?.reasons as string[]) || [];
    const detailParts = [
      `Elite Reach opportunity #${opp.id} (${opp.opportunityType}, score ${score?.totalScore ?? "?"}/100).`,
      reasons.length ? `Why: ${reasons.join("; ")}.` : null,
      intent?.destination ? `Destination: ${intent.destination}.` : null,
      signal?.sourceUrl ? `Source: ${signal.sourceUrl}` : null,
    ].filter(Boolean);

    const body = {
      fullName: `Elite Reach — ${signal?.source || "unknown"} signal #${signal?.id ?? opp.signalId}`,
      interestType,
      interestDetail: detailParts.join(" "),
      sourceChannel: "elite_reach",
    };

    const res = await fetch(`${CRM_BASE_URL}/api/public/leads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new BadRequestException(`Elite Escape OS rejected the lead: ${errText}`);
    }
    const created = await res.json();

    await this.db.update(opportunities).set({ status: "pushed_to_crm", crmLeadId: created.leadId, updatedAt: new Date() })
      .where(eq(opportunities.id, opp.id));
    await this.db.insert(opportunityEvents).values({
      opportunityId: opp.id, event: "pushed_to_crm", actorUserId, detail: `CRM lead #${created.leadId}`,
    });

    return { opportunityId: opp.id, crmLeadId: created.leadId, crmCustomerId: created.customerId };
  }
}
