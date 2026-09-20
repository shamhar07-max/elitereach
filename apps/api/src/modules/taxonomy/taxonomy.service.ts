import { Inject, Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DB } from "../../db/db.module";
import type { Db } from "../../db/client";
import { taxonomyTerms } from "../../db/schema";
import { DEFAULT_TAXONOMY } from "./default-taxonomy";

export interface ResolvedTaxonomy {
  destinationAliases: Record<string, string>;
  originKeywords: string[];
  tripTypeKeywords: Record<string, string[]>;
  readyToBuyPhrases: string[];
  comparisonPhrases: string[];
  discoveryPhrases: string[];
}

const CATEGORY = {
  destination: "destination_alias",
  origin: "origin_keyword",
  tripType: "trip_type_keyword",
  readyToBuy: "ready_to_buy_phrase",
  comparison: "comparison_phrase",
  discovery: "discovery_phrase",
} as const;

@Injectable()
export class TaxonomyService {
  constructor(@Inject(DB) private db: Db) {}

  /** Seeds a brand-new tenant with the Phase 1 defaults, so the system is
   * immediately useful without an admin having to populate taxonomy from
   * nothing first. Idempotent via the unique (tenant, category, term)
   * index — safe to call more than once. */
  async seedDefaults(tenantId: number) {
    const rows: (typeof taxonomyTerms.$inferInsert)[] = [];
    for (const [alias, canonical] of Object.entries(DEFAULT_TAXONOMY.destinationAliases)) {
      rows.push({ tenantId, category: CATEGORY.destination, term: alias, canonicalValue: canonical });
    }
    for (const keyword of DEFAULT_TAXONOMY.originKeywords) {
      rows.push({ tenantId, category: CATEGORY.origin, term: keyword });
    }
    for (const [type, keywords] of Object.entries(DEFAULT_TAXONOMY.tripTypeKeywords)) {
      for (const keyword of keywords) rows.push({ tenantId, category: CATEGORY.tripType, term: keyword, canonicalValue: type });
    }
    for (const phrase of DEFAULT_TAXONOMY.readyToBuyPhrases) rows.push({ tenantId, category: CATEGORY.readyToBuy, term: phrase });
    for (const phrase of DEFAULT_TAXONOMY.comparisonPhrases) rows.push({ tenantId, category: CATEGORY.comparison, term: phrase });
    for (const phrase of DEFAULT_TAXONOMY.discoveryPhrases) rows.push({ tenantId, category: CATEGORY.discovery, term: phrase });

    if (rows.length) await this.db.insert(taxonomyTerms).values(rows).onConflictDoNothing();
  }

  /** Builds the same shape IntentExtractionService used to import
   * statically, from whatever's in the DB right now for this tenant.
   * Self-heals a tenant with zero taxonomy rows (e.g. one created before
   * this table existed) by seeding defaults on first read, rather than
   * silently running the pipeline against an empty vocabulary. */
  async getForTenant(tenantId: number): Promise<ResolvedTaxonomy> {
    let rows = await this.db.select().from(taxonomyTerms).where(eq(taxonomyTerms.tenantId, tenantId));
    if (!rows.length) {
      await this.seedDefaults(tenantId);
      rows = await this.db.select().from(taxonomyTerms).where(eq(taxonomyTerms.tenantId, tenantId));
    }

    const destinationAliases: Record<string, string> = {};
    const tripTypeKeywords: Record<string, string[]> = {};
    const originKeywords: string[] = [];
    const readyToBuyPhrases: string[] = [];
    const comparisonPhrases: string[] = [];
    const discoveryPhrases: string[] = [];

    for (const row of rows) {
      switch (row.category) {
        case CATEGORY.destination: if (row.canonicalValue) destinationAliases[row.term] = row.canonicalValue; break;
        case CATEGORY.origin: originKeywords.push(row.term); break;
        case CATEGORY.tripType: if (row.canonicalValue) (tripTypeKeywords[row.canonicalValue] ??= []).push(row.term); break;
        case CATEGORY.readyToBuy: readyToBuyPhrases.push(row.term); break;
        case CATEGORY.comparison: comparisonPhrases.push(row.term); break;
        case CATEGORY.discovery: discoveryPhrases.push(row.term); break;
      }
    }
    return { destinationAliases, originKeywords, tripTypeKeywords, readyToBuyPhrases, comparisonPhrases, discoveryPhrases };
  }

  list(tenantId: number) {
    return this.db.select().from(taxonomyTerms).where(eq(taxonomyTerms.tenantId, tenantId)).orderBy(taxonomyTerms.category, taxonomyTerms.term);
  }

  async addTerm(tenantId: number, category: string, term: string, canonicalValue?: string) {
    const normalizedTerm = term.trim().toLowerCase();
    const existing = await this.db.select().from(taxonomyTerms)
      .where(and(eq(taxonomyTerms.tenantId, tenantId), eq(taxonomyTerms.category, category as any), eq(taxonomyTerms.term, normalizedTerm)))
      .limit(1);
    if (existing.length) throw new ConflictException("this term already exists in this category");

    const [row] = await this.db.insert(taxonomyTerms).values({
      tenantId, category: category as any, term: normalizedTerm, canonicalValue: canonicalValue?.trim() || null,
    }).returning();
    return row;
  }

  async removeTerm(tenantId: number, id: number) {
    const result = await this.db.delete(taxonomyTerms)
      .where(and(eq(taxonomyTerms.id, id), eq(taxonomyTerms.tenantId, tenantId))).returning();
    if (!result.length) throw new NotFoundException("term not found");
    return { ok: true };
  }
}
