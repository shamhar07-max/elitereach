import { Inject, Injectable } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { DB } from "../../db/db.module";
import type { Db } from "../../db/client";
import { campaigns } from "../../db/schema";

export interface CreateCampaignDto {
  name: string;
  objective?: string;
  destinations?: string[];
  originLocations?: string[];
  services?: string[];
  keywords?: string[];
  dailyLimit?: number;
}

@Injectable()
export class CampaignsService {
  constructor(@Inject(DB) private db: Db) {}

  list(tenantId: number) {
    return this.db.select().from(campaigns).where(eq(campaigns.tenantId, tenantId));
  }

  async create(tenantId: number, ownerUserId: number, dto: CreateCampaignDto) {
    const [row] = await this.db.insert(campaigns).values({
      tenantId, ownerUserId, name: dto.name, objective: dto.objective,
      destinations: dto.destinations || [], originLocations: dto.originLocations || [],
      services: dto.services || [], keywords: dto.keywords || [], dailyLimit: dto.dailyLimit,
      status: "active",
    }).returning();
    return row;
  }

  async setStatus(tenantId: number, id: number, status: string) {
    const [row] = await this.db.update(campaigns).set({ status })
      .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId))).returning();
    return row;
  }
}
