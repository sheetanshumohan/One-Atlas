import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService, PrismaTx } from '../prisma/prisma.service';

/**
 * Owns the denormalised pricing columns on Model (minInputPrice, minOutputPrice, providerCount).
 * Every code path that mutates ModelProvider rows calls `recompute` with the same transaction
 * client, so the summary columns can never drift from the source rows.
 */
@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Serialises concurrent offering writes per model: must be called at the START of any transaction
   * that will change a model's offerings. Without it, two READ COMMITTED transactions can each run
   * `recompute` before the other commits and persist a stale summary (reproduced by the e2e race test).
   * Ids are locked in sorted order so multi-model transactions (provider delete) cannot deadlock.
   */
  async lockModels(tx: PrismaTx, modelIds: string[]): Promise<void> {
    const ids = [...new Set(modelIds)].sort();
    if (ids.length === 0) return;
    await tx.$queryRaw`SELECT "id" FROM "Model" WHERE "id" = ANY(${ids}::text[]) ORDER BY "id" FOR UPDATE`;
  }

  async recompute(tx: PrismaTx, modelIds: string[]): Promise<void> {
    const ids = [...new Set(modelIds)];
    if (ids.length === 0) return;
    await tx.$executeRaw`
      UPDATE "Model" AS m
      SET "minInputPrice"  = agg.min_in,
          "minOutputPrice" = agg.min_out,
          "providerCount"  = agg.cnt,
          "updatedAt"      = NOW()
      FROM (
        SELECT m2."id",
               MIN(mp."inputPricePerMTok")  AS min_in,
               MIN(mp."outputPricePerMTok") AS min_out,
               COUNT(mp."id")::int          AS cnt
        FROM "Model" m2
        LEFT JOIN "ModelProvider" mp ON mp."modelId" = m2."id" AND mp."isAvailable" = TRUE
        WHERE m2."id" = ANY(${ids}::text[])
        GROUP BY m2."id"
      ) AS agg
      WHERE m."id" = agg."id"`;
  }

  /** Full rebuild — used after bulk ingestion/seeding and exposed as an admin repair endpoint. */
  async recomputeAll(tx: PrismaTx = this.prisma): Promise<number> {
    return tx.$executeRaw(Prisma.sql`
      UPDATE "Model" AS m
      SET "minInputPrice"  = agg.min_in,
          "minOutputPrice" = agg.min_out,
          "providerCount"  = agg.cnt
      FROM (
        SELECT m2."id",
               MIN(mp."inputPricePerMTok")  AS min_in,
               MIN(mp."outputPricePerMTok") AS min_out,
               COUNT(mp."id")::int          AS cnt
        FROM "Model" m2
        LEFT JOIN "ModelProvider" mp ON mp."modelId" = m2."id" AND mp."isAvailable" = TRUE
        GROUP BY m2."id"
      ) AS agg
      WHERE m."id" = agg."id"`);
  }
}
