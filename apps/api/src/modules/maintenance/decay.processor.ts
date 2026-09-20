import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { and, eq, isNotNull, lt } from "drizzle-orm";
import { DB } from "../../db/db.module";
import type { Db } from "../../db/client";
import { opportunities } from "../../db/schema";
import { MAINTENANCE_QUEUE } from "./maintenance.service";

/* Lead decay (spec §12): a travel opportunity's priority isn't static —
 * "need a desert safari tomorrow" is worthless a week later. Rather than
 * silently going stale, an open opportunity past its expiresAt is marked
 * `expired` so it drops out of the active queue sales staff work from,
 * without deleting the record (still useful for the feedback-learning
 * loop in a later phase — did we lose this one to slow response time?). */
@Processor(MAINTENANCE_QUEUE)
export class DecayProcessor extends WorkerHost {
  private readonly logger = new Logger(DecayProcessor.name);

  constructor(@Inject(DB) private db: Db) {
    super();
  }

  async process(_job: Job) {
    const expired = await this.db.update(opportunities)
      .set({ status: "expired", updatedAt: new Date() })
      .where(and(eq(opportunities.status, "open"), isNotNull(opportunities.expiresAt), lt(opportunities.expiresAt, new Date())))
      .returning({ id: opportunities.id });

    if (expired.length) this.logger.log(`decayed ${expired.length} opportunity(ies): ${expired.map((o) => o.id).join(", ")}`);
    return { expiredCount: expired.length };
  }
}
