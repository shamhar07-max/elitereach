import { Inject, Injectable } from "@nestjs/common";
import { DB } from "../../db/db.module";
import type { Db } from "../../db/client";
import { auditEvents } from "../../db/schema";

@Injectable()
export class AuditService {
  constructor(@Inject(DB) private db: Db) {}

  log(tenantId: number, actorUserId: number | null, action: string, entityType: string, entityId?: number, detail?: string) {
    return this.db.insert(auditEvents).values({ tenantId, actorUserId: actorUserId ?? undefined, action, entityType, entityId, detail });
  }
}
