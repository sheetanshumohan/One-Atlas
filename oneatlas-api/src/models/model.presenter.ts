import { Prisma } from '@prisma/client';
import { dec, isoDate } from '../common/utils/decimal';
import { normalizeScore } from '../common/utils/scoring';

export const modelSummaryInclude = {
  organization: { select: { slug: true, name: true } },
  capabilities: { select: { capability: { select: { slug: true } } } },
} satisfies Prisma.ModelInclude;

export const modelDetailInclude = {
  organization: { select: { slug: true, name: true, type: true, website: true } },
  capabilities: { select: { capability: { select: { slug: true, name: true, description: true } } } },
  offerings: {
    include: { provider: { select: { slug: true, name: true, website: true } } },
    orderBy: [{ inputPricePerMTok: 'asc' }, { outputPricePerMTok: 'asc' }],
  },
  benchmarks: {
    include: { benchmark: true },
    orderBy: [{ benchmark: { category: 'asc' } }, { benchmark: { name: 'asc' } }],
  },
} satisfies Prisma.ModelInclude;

export type ModelWithSummary = Prisma.ModelGetPayload<{ include: typeof modelSummaryInclude }>;
export type ModelWithDetail = Prisma.ModelGetPayload<{ include: typeof modelDetailInclude }>;
type OfferingWithProvider = ModelWithDetail['offerings'][number];
type ResultWithBenchmark = ModelWithDetail['benchmarks'][number];

function basePricing(m: { minInputPrice: Prisma.Decimal | null; minOutputPrice: Prisma.Decimal | null; providerCount: number }) {
  return {
    minInputPricePerMTok: dec(m.minInputPrice),
    minOutputPricePerMTok: dec(m.minOutputPrice),
    providerCount: m.providerCount,
    currency: 'USD',
    unit: 'per_1m_tokens',
  };
}

export function presentModelSummary(m: ModelWithSummary) {
  return {
    id: m.id,
    slug: m.slug,
    name: m.name,
    type: m.type,
    status: m.status,
    organization: m.organization,
    releaseDate: isoDate(m.releaseDate),
    contextWindow: m.contextWindow,
    maxOutputTokens: m.maxOutputTokens,
    openWeights: m.openWeights,
    inputModalities: m.inputModalities,
    outputModalities: m.outputModalities,
    capabilities: m.capabilities.map((c) => c.capability.slug).sort(),
    pricing: basePricing(m),
  };
}

export function presentOffering(o: OfferingWithProvider) {
  return {
    provider: o.provider,
    providerModelId: o.providerModelId,
    inputPricePerMTok: dec(o.inputPricePerMTok),
    outputPricePerMTok: dec(o.outputPricePerMTok),
    cachedInputPerMTok: dec(o.cachedInputPerMTok),
    contextWindow: o.contextWindow,
    maxOutputTokens: o.maxOutputTokens,
    avgLatencyMs: o.avgLatencyMs,
    throughputTps: dec(o.throughputTps),
    uptimePct: dec(o.uptimePct),
    isAvailable: o.isAvailable,
    updatedAt: o.updatedAt.toISOString(),
  };
}

export function presentBenchmarkResult(r: ResultWithBenchmark) {
  const scale = {
    minScore: r.benchmark.minScore.toNumber(),
    maxScore: r.benchmark.maxScore.toNumber(),
    higherIsBetter: r.benchmark.higherIsBetter,
  };
  const score = r.score.toNumber();
  return {
    benchmark: {
      slug: r.benchmark.slug,
      name: r.benchmark.name,
      category: r.benchmark.category,
      unit: r.benchmark.unit,
      ...scale,
    },
    score,
    normalizedScore: normalizeScore(score, scale),
    sourceUrl: r.sourceUrl,
    measuredAt: isoDate(r.measuredAt),
  };
}

export function presentModelDetail(m: ModelWithDetail) {
  return {
    id: m.id,
    slug: m.slug,
    name: m.name,
    description: m.description,
    type: m.type,
    status: m.status,
    organization: m.organization,
    releaseDate: isoDate(m.releaseDate),
    knowledgeCutoff: isoDate(m.knowledgeCutoff),
    contextWindow: m.contextWindow,
    maxOutputTokens: m.maxOutputTokens,
    parameterCountB: dec(m.parameterCountB),
    openWeights: m.openWeights,
    license: m.license,
    inputModalities: m.inputModalities,
    outputModalities: m.outputModalities,
    capabilities: m.capabilities.map((c) => c.capability).sort((a, b) => a.slug.localeCompare(b.slug)),
    pricing: basePricing(m),
    providers: m.offerings.map(presentOffering),
    benchmarks: m.benchmarks.map(presentBenchmarkResult),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export type ModelSummaryView = ReturnType<typeof presentModelSummary>;
export type ModelDetailView = ReturnType<typeof presentModelDetail>;
