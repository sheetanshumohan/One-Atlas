import { PrismaClient } from '@prisma/client';

/**
 * Small deterministic dataset — every e2e assertion about ordering, filtering and ranking
 * is computed by hand from these values (see comments).
 *
 *  model      org        type       status      release     ctx     open  caps                           offerings (available)            minIn  minOut
 *  alpha-1    alpha-lab  CHAT       ACTIVE      2024-01-10  128000  no    tool-calling,json-mode         cloud-a 1/2, cloud-b 0.5/3       0.5    2
 *  alpha-2    alpha-lab  REASONING  ACTIVE      2025-03-01  200000  no    reasoning,tool-calling,vision  cloud-a 10/40                    10     40
 *  beta-1     beta-corp  CHAT       ACTIVE      2023-06-15  32000   yes   json-mode                      cloud-b 0.2/0.2 (cloud-a 0.1 OFF) 0.2   0.2
 *  beta-code  beta-corp  CODE       PREVIEW     null        null    yes   —                              —                                null   null
 *  beta-old   beta-corp  CHAT       DEPRECATED  2022-01-01  8000    no    —                              cloud-b 5/5                      5      5
 */
export async function resetDb(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "BenchmarkResult", "ModelProvider", "ModelCapability", "Model", "Benchmark", "Capability", "Provider", "Organization" RESTART IDENTITY CASCADE',
  );
}

export async function seedFixtures(prisma: PrismaClient): Promise<void> {
  await resetDb(prisma);

  const [alphaLab, betaCorp] = await Promise.all([
    prisma.organization.create({ data: { slug: 'alpha-lab', name: 'Alpha Lab', type: 'AI_LAB', country: 'US', foundedYear: 2015, description: 'First lab' } }),
    prisma.organization.create({ data: { slug: 'beta-corp', name: 'Beta Corp', type: 'BIG_TECH', country: 'FR', foundedYear: 2000 } }),
    prisma.organization.create({ data: { slug: 'gamma-labs', name: 'Gamma Labs', type: 'STARTUP', country: 'GB' } }),
  ]);
  const [cloudA, cloudB] = await Promise.all([
    prisma.provider.create({ data: { slug: 'cloud-a', name: 'Cloud A', website: 'https://a.example.com' } }),
    prisma.provider.create({ data: { slug: 'cloud-b', name: 'Cloud B' } }),
    prisma.provider.create({ data: { slug: 'cloud-c', name: 'Cloud C' } }),
  ]);
  const caps = Object.fromEntries(
    await Promise.all(
      ['tool-calling', 'vision', 'reasoning', 'json-mode'].map(async (slug) => [slug, (await prisma.capability.create({ data: { slug, name: slug } })).id] as const),
    ),
  );
  const bench = Object.fromEntries(
    await Promise.all(
      [
        { slug: 'know-1', name: 'Know 1', category: 'GENERAL_KNOWLEDGE' as const },
        { slug: 'code-1', name: 'Code 1', category: 'CODING' as const },
        { slug: 'code-2', name: 'Code 2', category: 'CODING' as const },
        { slug: 'elo-1', name: 'Elo 1', category: 'GENERAL_KNOWLEDGE' as const, unit: 'elo', minScore: 800, maxScore: 1600 },
        { slug: 'err-1', name: 'Err 1', category: 'REASONING' as const, higherIsBetter: false },
      ].map(async (b) => [b.slug, (await prisma.benchmark.create({ data: b })).id] as const),
    ),
  );

  const mk = async (data: {
    slug: string; name: string; org: string; type: 'CHAT' | 'REASONING' | 'CODE'; status?: 'ACTIVE' | 'PREVIEW' | 'DEPRECATED';
    release: string | null; ctx: number | null; open: boolean; caps: string[]; input?: ('TEXT' | 'IMAGE')[]; description?: string;
  }) =>
    prisma.model.create({
      data: {
        slug: data.slug,
        name: data.name,
        description: data.description,
        organizationId: data.org,
        type: data.type,
        status: data.status ?? 'ACTIVE',
        releaseDate: data.release ? new Date(data.release) : null,
        contextWindow: data.ctx,
        maxOutputTokens: data.ctx ? 4096 : null,
        openWeights: data.open,
        inputModalities: data.input ?? ['TEXT'],
        outputModalities: ['TEXT'],
        capabilities: { create: data.caps.map((c) => ({ capabilityId: caps[c] })) },
      },
    });

  const alpha1 = await mk({ slug: 'alpha-1', name: 'Alpha 1', org: alphaLab.id, type: 'CHAT', release: '2024-01-10', ctx: 128000, open: false, caps: ['tool-calling', 'json-mode'], description: 'General purpose chat' });
  const alpha2 = await mk({ slug: 'alpha-2', name: 'Alpha 2', org: alphaLab.id, type: 'REASONING', release: '2025-03-01', ctx: 200000, open: false, caps: ['reasoning', 'tool-calling', 'vision'], input: ['TEXT', 'IMAGE'] });
  const beta1 = await mk({ slug: 'beta-1', name: 'Beta 1', org: betaCorp.id, type: 'CHAT', release: '2023-06-15', ctx: 32000, open: true, caps: ['json-mode'] });
  const betaCode = await mk({ slug: 'beta-code', name: 'Beta Coder', org: betaCorp.id, type: 'CODE', status: 'PREVIEW', release: null, ctx: null, open: true, caps: [] });
  const betaOld = await mk({ slug: 'beta-old', name: 'Beta Old', org: betaCorp.id, type: 'CHAT', status: 'DEPRECATED', release: '2022-01-01', ctx: 8000, open: false, caps: [] });

  await prisma.modelProvider.createMany({
    data: [
      { modelId: alpha1.id, providerId: cloudA.id, providerModelId: 'a/alpha-1', inputPricePerMTok: 1, outputPricePerMTok: 2 },
      { modelId: alpha1.id, providerId: cloudB.id, providerModelId: 'b/alpha-1', inputPricePerMTok: 0.5, outputPricePerMTok: 3 },
      { modelId: alpha2.id, providerId: cloudA.id, providerModelId: 'a/alpha-2', inputPricePerMTok: 10, outputPricePerMTok: 40 },
      { modelId: beta1.id, providerId: cloudB.id, providerModelId: 'b/beta-1', inputPricePerMTok: 0.2, outputPricePerMTok: 0.2 },
      { modelId: beta1.id, providerId: cloudA.id, providerModelId: 'a/beta-1', inputPricePerMTok: 0.1, outputPricePerMTok: 0.1, isAvailable: false },
      { modelId: betaOld.id, providerId: cloudB.id, providerModelId: 'b/beta-old', inputPricePerMTok: 5, outputPricePerMTok: 5 },
    ],
  });

  const r = (modelId: string, b: string, score: number) => ({ modelId, benchmarkId: bench[b], score });
  await prisma.benchmarkResult.createMany({
    data: [
      r(alpha1.id, 'know-1', 80), r(alpha2.id, 'know-1', 90), r(beta1.id, 'know-1', 70), r(betaOld.id, 'know-1', 70),
      r(alpha1.id, 'code-1', 60), r(alpha2.id, 'code-1', 85), r(betaCode.id, 'code-1', 95),
      r(alpha2.id, 'code-2', 75), r(betaCode.id, 'code-2', 65),
      r(alpha1.id, 'elo-1', 1200), r(alpha2.id, 'elo-1', 1400),
      r(alpha1.id, 'err-1', 10), r(beta1.id, 'err-1', 30),
    ],
  });

  await prisma.$executeRaw`
    UPDATE "Model" AS m SET "minInputPrice" = agg.mi, "minOutputPrice" = agg.mo, "providerCount" = agg.c
    FROM (SELECT m2.id, MIN(mp."inputPricePerMTok") mi, MIN(mp."outputPricePerMTok") mo, COUNT(mp.id)::int c
          FROM "Model" m2 LEFT JOIN "ModelProvider" mp ON mp."modelId" = m2.id AND mp."isAvailable"
          GROUP BY m2.id) agg
    WHERE m.id = agg.id`;
}

/**
 * Invariant check: the denormalised pricing columns must equal a fresh aggregate over offerings.
 * Returns the slugs of models that violate it (expected: []).
 */
export async function pricingInconsistencies(prisma: PrismaClient): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ slug: string }[]>`
    SELECT m.slug FROM "Model" m
    LEFT JOIN (
      SELECT "modelId", MIN("inputPricePerMTok") mi, MIN("outputPricePerMTok") mo, COUNT(*)::int c
      FROM "ModelProvider" WHERE "isAvailable" GROUP BY "modelId"
    ) a ON a."modelId" = m.id
    WHERE m."minInputPrice" IS DISTINCT FROM a.mi
       OR m."minOutputPrice" IS DISTINCT FROM a.mo
       OR m."providerCount" <> COALESCE(a.c, 0)`;
  return rows.map((r) => r.slug);
}
