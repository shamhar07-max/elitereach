import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DB } from "../../db/db.module";
import type { Db } from "../../db/client";
import { connectors, connectorHealth, connectorRuns } from "../../db/schema";
import { ManualImportConnector } from "./manual-import.connector";
import { RedditConnector } from "./reddit.connector";
import { YoutubeConnector } from "./youtube.connector";
import type { SourceConnector } from "./connector.interface";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class ConnectorsService {
  private registry: Record<string, SourceConnector>;

  constructor(
    @Inject(DB) private db: Db,
    private audit: AuditService,
    manual: ManualImportConnector,
    reddit: RedditConnector,
    youtube: YoutubeConnector,
  ) {
    this.registry = { manual: manual, reddit: reddit, youtube: youtube };
  }

  getAdapter(source: string): SourceConnector {
    const adapter = this.registry[source];
    if (!adapter) throw new NotFoundException(`no connector adapter registered for source "${source}"`);
    return adapter;
  }

  async list(tenantId: number) {
    return this.db.select().from(connectors).where(eq(connectors.tenantId, tenantId));
  }

  async ensureSeeded(tenantId: number, actorUserId: number) {
    const existing = await this.list(tenantId);
    const bySource = new Set(existing.map((c) => c.source));
    const toSeed = Object.values(this.registry).filter((a) => !bySource.has(a.source));

    for (const adapter of toSeed) {
      const meta = adapter.complianceMetadata();
      const [row] = await this.db.insert(connectors).values({
        tenantId, source: adapter.source, accessType: meta.accessType,
        commercialUseStatus: meta.commercialUseStatus, productionLevel: meta.productionLevel,
        config: {},
      }).returning();
      await this.db.insert(connectorHealth).values({ connectorId: row.id, health: "unknown" });
      await this.audit.log(tenantId, actorUserId, "create", "connector", row.id, adapter.source);
    }
    return this.list(tenantId);
  }

  async checkHealth(connectorId: number) {
    const [connector] = await this.db.select().from(connectors).where(eq(connectors.id, connectorId)).limit(1);
    if (!connector) throw new NotFoundException("connector not found");

    const adapter = this.getAdapter(connector.source);
    const result = await adapter.healthCheck();
    const rate = await adapter.rateLimitState();

    await this.db.update(connectorHealth).set({
      health: result.healthy ? "healthy" : "down",
      lastErrorAt: result.healthy ? undefined : new Date(),
      lastErrorMessage: result.healthy ? null : result.message,
      lastSuccessfulRunAt: result.healthy ? new Date() : undefined,
      rateLimitRemaining: rate.remaining,
      updatedAt: new Date(),
    }).where(eq(connectorHealth.connectorId, connectorId));

    return { connectorId, ...result, rateLimit: rate };
  }

  async listHealth(tenantId: number) {
    const rows = await this.db.select({
      id: connectors.id, source: connectors.source, accessType: connectors.accessType,
      commercialUseStatus: connectors.commercialUseStatus, productionLevel: connectors.productionLevel,
      health: connectorHealth.health, lastSuccessfulRunAt: connectorHealth.lastSuccessfulRunAt,
      lastErrorAt: connectorHealth.lastErrorAt, lastErrorMessage: connectorHealth.lastErrorMessage,
      rateLimitRemaining: connectorHealth.rateLimitRemaining,
    }).from(connectors)
      .leftJoin(connectorHealth, eq(connectorHealth.connectorId, connectors.id))
      .where(eq(connectors.tenantId, tenantId));
    return rows;
  }

  async recordRun(connectorId: number, status: "succeeded" | "failed", signalsIngested: number, errorMessage?: string) {
    await this.db.insert(connectorRuns).values({ connectorId, status, signalsIngested, errorMessage, finishedAt: new Date() });
  }
}
