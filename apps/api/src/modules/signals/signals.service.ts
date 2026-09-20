import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { and, eq, desc } from "drizzle-orm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { DB } from "../../db/db.module";
import type { Db } from "../../db/client";
import { signals, connectors } from "../../db/schema";
import { RawSignalInput } from "../connectors/connector.interface";

export const SIGNAL_QUEUE = "signal-processing";

const normalizeText = (text: string) => text.trim().replace(/\s+/g, " ").toLowerCase();
const hash = (s: string) => createHash("sha256").update(s).digest("hex");

@Injectable()
export class SignalsService {
  constructor(@Inject(DB) private db: Db, @InjectQueue(SIGNAL_QUEUE) private queue: Queue) {}

  /** Ingests one raw signal from any connector. Returns { inserted: false }
   * on an exact duplicate (level-1 dedup, spec §6) rather than erroring —
   * duplicates are an expected, routine outcome, not a failure. */
  async ingestOne(tenantId: number, connectorId: number, campaignId: number | null, source: string, raw: RawSignalInput) {
    const textNormalized = normalizeText(raw.text);
    const dedupeHash = hash(`${source}::${raw.authorExternalId || ""}::${textNormalized}`);
    const rawPayloadHash = hash(JSON.stringify(raw));

    const [connector] = await this.db.select().from(connectors).where(eq(connectors.id, connectorId)).limit(1);
    if (!connector) throw new NotFoundException("connector not found");

    const existing = await this.db.select({ id: signals.id }).from(signals)
      .where(and(eq(signals.tenantId, tenantId), eq(signals.dedupeHash, dedupeHash))).limit(1);
    if (existing.length) return { inserted: false, signalId: existing[0].id, reason: "exact_duplicate" as const };

    const [row] = await this.db.insert(signals).values({
      tenantId, connectorId, campaignId: campaignId ?? undefined, source,
      sourceRecordId: raw.sourceRecordId, sourceUrl: raw.sourceUrl, sourceThreadId: raw.sourceThreadId,
      authorExternalId: raw.authorExternalId, authorDisplayName: raw.authorDisplayName,
      publishedAt: raw.publishedAt, language: raw.language || "en",
      textOriginal: raw.text, textNormalized,
      engagementLikes: raw.engagementLikes || 0, engagementComments: raw.engagementComments || 0,
      locationHint: raw.locationHint, sourceAccessClass: connector.accessType,
      rawPayloadHash, dedupeHash, processingStatus: "pending",
    }).returning();

    await this.queue.add("process", { signalId: row.id }, { removeOnComplete: 100, removeOnFail: 100 });
    return { inserted: true, signalId: row.id, reason: null };
  }

  async ingestBatch(tenantId: number, connectorId: number, campaignId: number | null, source: string, items: RawSignalInput[]) {
    const results: Awaited<ReturnType<SignalsService["ingestOne"]>>[] = [];
    for (const item of items) results.push(await this.ingestOne(tenantId, connectorId, campaignId, source, item));
    return {
      total: items.length,
      inserted: results.filter((r) => r.inserted).length,
      duplicates: results.filter((r) => !r.inserted).length,
      results,
    };
  }

  list(tenantId: number, limit = 100) {
    return this.db.select().from(signals).where(eq(signals.tenantId, tenantId)).orderBy(desc(signals.createdAt)).limit(limit);
  }

  async getOne(tenantId: number, id: number) {
    const [row] = await this.db.select().from(signals).where(and(eq(signals.id, id), eq(signals.tenantId, tenantId))).limit(1);
    if (!row) throw new NotFoundException("signal not found");
    return row;
  }
}
