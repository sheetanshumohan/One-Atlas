import { Injectable } from '@nestjs/common';
import { PriceChange, Prisma } from '@prisma/client';
import { PrismaService, PrismaTx } from '../prisma/prisma.service';

type Num = Prisma.Decimal | number | string;

/** The price-relevant state of an offering (what the history log tracks). */
export interface PriceSnapshot {
  inputPricePerMTok: Num;
  outputPricePerMTok: Num;
  cachedInputPerMTok: Num | null;
  isAvailable: boolean;
}

const decEq = (a: Num | null, b: Num | null): boolean =>
  a === null || b === null ? a === b : new Prisma.Decimal(a).equals(new Prisma.Decimal(b));

/** Pure: which history event (if any) a before → after transition represents. Unit-tested. */
export function classifyPriceChange(before: PriceSnapshot | null, after: PriceSnapshot | null): PriceChange | null {
  if (!before && !after) return null;
  if (!before) return PriceChange.CREATED;
  if (!after) return PriceChange.REMOVED;
  const same =
    decEq(before.inputPricePerMTok, after.inputPricePerMTok) &&
    decEq(before.outputPricePerMTok, after.outputPricePerMTok) &&
    decEq(before.cachedInputPerMTok, after.cachedInputPerMTok) &&
    before.isAvailable === after.isAvailable;
  return same ? null : PriceChange.UPDATED;
}

/**
 * Owns everything price-related that must stay consistent with ModelProvider rows:
 *  - the denormalised summary on Model (minInputPrice, minOutputPrice, providerCount), and
 *  - the append-only PriceHistory log.
 * Every code path that mutates offerings calls these with the SAME transaction client, so neither the
 * summary nor the history can drift from the source rows.
 */
@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Writes a history row for an offering change, only when prices or availability actually changed
   * (re-saving identical data is not an event). REMOVED rows keep the last known prices.
   */
  async recordChange(
    tx: PrismaTx,
    ref: { modelId: string; providerId: string },
    before: PriceSnapshot | null,
    after: PriceSnapshot | null,
    source: string,
  ): Promise<PriceChange | null> {
    const change = classifyPriceChange(before, after);
    if (!change) return null;
    const snap = (after ?? before)!;
    await tx.priceHistory.create({
      data: {
        modelId: ref.modelId,
        providerId: ref.providerId,
        change,
        inputPricePerMTok: snap.inputPricePerMTok,
        outputPricePerMTok: snap.outputPricePerMTok,
        cachedInputPerMTok: snap.cachedInputPerMTok,
        isAvailable: change === PriceChange.REMOVED ? false : snap.isAvailable,
        source: source.slice(0, 64),
      },
    });
    return change;
  }

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
