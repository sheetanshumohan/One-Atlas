import { PrismaClient } from '@prisma/client';
import { benchmarks, capabilities, models, organizations, priceTimelines, providers } from './seed-data';

const prisma = new PrismaClient();

/** Fully idempotent: safe to re-run; upserts by natural key (slug). */
export async function seed(client: PrismaClient = prisma): Promise<void> {
  for (const o of organizations) await client.organization.upsert({ where: { slug: o.slug }, create: o, update: o });
  for (const p of providers) await client.provider.upsert({ where: { slug: p.slug }, create: p, update: p });
  for (const c of capabilities) await client.capability.upsert({ where: { slug: c.slug }, create: c, update: c });
  for (const b of benchmarks) await client.benchmark.upsert({ where: { slug: b.slug }, create: b, update: b });

  const orgIds = new Map((await client.organization.findMany()).map((o) => [o.slug, o.id]));
  const providerIds = new Map((await client.provider.findMany()).map((p) => [p.slug, p.id]));
  const capIds = new Map((await client.capability.findMany()).map((c) => [c.slug, c.id]));
  const benchIds = new Map((await client.benchmark.findMany()).map((b) => [b.slug, b.id]));

  const req = <T>(map: Map<string, T>, key: string, kind: string): T => {
    const v = map.get(key);
    if (v === undefined) throw new Error(`Seed data references unknown ${kind} '${key}'`);
    return v;
  };

  for (const m of models) {
    if (m.maxOut && m.ctx && m.maxOut > m.ctx) throw new Error(`Seed model ${m.slug}: maxOut > ctx`);
    const data = {
      name: m.name,
      description: m.description,
      organizationId: req(orgIds, m.org, 'organization'),
      type: m.type,
      status: m.status ?? 'ACTIVE',
      releaseDate: m.release ? new Date(m.release) : null,
      knowledgeCutoff: m.cutoff ? new Date(m.cutoff) : null,
      contextWindow: m.ctx,
      maxOutputTokens: m.maxOut ?? null,
      parameterCountB: m.params ?? null,
      openWeights: m.open ?? false,
      license: m.license ?? null,
      inputModalities: m.input,
      outputModalities: m.output,
    };

    await client.$transaction(async (tx) => {
      const model = await tx.model.upsert({ where: { slug: m.slug }, create: { slug: m.slug, ...data }, update: data });
      await tx.modelCapability.deleteMany({ where: { modelId: model.id } });
      await tx.modelCapability.createMany({ data: m.caps.map((c) => ({ modelId: model.id, capabilityId: req(capIds, c, 'capability') })) });

      for (const [provider, providerModelId, input, output, extra] of m.offers) {
        const providerId = req(providerIds, provider, 'provider');
        const fields = {
          providerModelId,
          inputPricePerMTok: input,
          outputPricePerMTok: output,
          cachedInputPerMTok: extra?.cached ?? null,
          avgLatencyMs: extra?.latency ?? null,
          throughputTps: extra?.tps ?? null,
          uptimePct: extra?.uptime ?? null,
          isAvailable: extra?.available ?? true,
        };
        await tx.modelProvider.upsert({
          where: { modelId_providerId: { modelId: model.id, providerId } },
          create: { modelId: model.id, providerId, ...fields },
          update: fields,
        });

        // Price history (idempotent). Placeholder rows from the migration backfill are replaced by the seed's
        // timeline; any other existing history (API / ingestion / earlier seed) is left untouched.
        const existing = await tx.priceHistory.findMany({ where: { modelId: model.id, providerId }, select: { source: true } });
        if (existing.every((h) => h.source === 'backfill')) {
          await tx.priceHistory.deleteMany({ where: { modelId: model.id, providerId, source: 'backfill' } });
          const timeline = priceTimelines.filter(([tm, tp]) => tm === m.slug && tp === provider);
          const events = timeline.length
            ? timeline.map(([, , date, i, o], idx) => ({ date, input: i, output: o, change: idx === 0 ? ('CREATED' as const) : ('UPDATED' as const) }))
            : [{ date: m.release ?? '2024-01-01', input, output, change: 'CREATED' as const }];
          const last = events[events.length - 1];
          if (last.input !== input || last.output !== output) {
            throw new Error(`Seed price timeline for ${m.slug}@${provider} must end at the current price ${input}/${output}`);
          }
          await tx.priceHistory.createMany({
            data: events.map((e, idx) => ({
              modelId: model.id,
              providerId,
              change: e.change,
              inputPricePerMTok: e.input,
              outputPricePerMTok: e.output,
              // cached price / availability are only known for the current state
              cachedInputPerMTok: idx === events.length - 1 ? fields.cachedInputPerMTok : null,
              isAvailable: idx === events.length - 1 ? fields.isAvailable : true,
              source: 'seed',
              recordedAt: new Date(e.date),
            })),
          });
        }
      }
      for (const [bench, score] of Object.entries(m.scores)) {
        const benchmarkId = req(benchIds, bench, 'benchmark');
        await tx.benchmarkResult.upsert({
          where: { modelId_benchmarkId: { modelId: model.id, benchmarkId } },
          create: { modelId: model.id, benchmarkId, score },
          update: { score },
        });
      }
    });
  }

  // Rebuild denormalised pricing summaries in one statement.
  await client.$executeRaw`
    UPDATE "Model" AS m
    SET "minInputPrice" = agg.min_in, "minOutputPrice" = agg.min_out, "providerCount" = agg.cnt
    FROM (
      SELECT m2."id", MIN(mp."inputPricePerMTok") AS min_in, MIN(mp."outputPricePerMTok") AS min_out, COUNT(mp."id")::int AS cnt
      FROM "Model" m2 LEFT JOIN "ModelProvider" mp ON mp."modelId" = m2."id" AND mp."isAvailable" = TRUE
      GROUP BY m2."id"
    ) AS agg
    WHERE m."id" = agg."id"`;
}

if (require.main === module) {
  seed()
    .then(async () => {
      const [m, o, p, b] = await Promise.all([prisma.model.count(), prisma.organization.count(), prisma.provider.count(), prisma.benchmarkResult.count()]);
      console.log(`Seeded: ${m} models, ${o} organizations, ${p} providers, ${b} benchmark results`);
    })
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
