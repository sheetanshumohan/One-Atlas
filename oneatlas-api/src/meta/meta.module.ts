import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BenchmarkCategory, Modality, ModelStatus, ModelType } from '@prisma/client';
import { MAX_PAGE_SIZE } from '../common/dto/pagination.dto';
import { dec } from '../common/utils/decimal';
import { MAX_COMPARE, MIN_COMPARE } from '../models/dto/compare-models.query';
import { DEFAULT_ORDER, MODEL_SORT_FIELDS } from '../models/dto/list-models.query';
import { PrismaService } from '../prisma/prisma.service';
import { enumOptions, LABELS } from './labels';

/** Context-window buckets offered as filters (min tokens). Counts are computed live. */
export const CONTEXT_BUCKETS = [32_000, 128_000, 200_000, 1_000_000];

const SORT_LABELS: Record<(typeof MODEL_SORT_FIELDS)[number], string> = {
  releaseDate: 'Release date', name: 'Name', contextWindow: 'Context window', inputPrice: 'Input price',
  outputPrice: 'Output price', providerCount: 'Number of providers', createdAt: 'Recently added',
};

/** Ready-made sort choices (field + direction + label) so clients don't re-implement sort semantics. */
const SORT_PRESETS: { sort: (typeof MODEL_SORT_FIELDS)[number]; order: 'asc' | 'desc'; label: string }[] = [
  { sort: 'releaseDate', order: 'desc', label: 'Newest' },
  { sort: 'releaseDate', order: 'asc', label: 'Oldest' },
  { sort: 'inputPrice', order: 'asc', label: 'Input price: low → high' },
  { sort: 'inputPrice', order: 'desc', label: 'Input price: high → low' },
  { sort: 'outputPrice', order: 'asc', label: 'Output price: low → high' },
  { sort: 'contextWindow', order: 'desc', label: 'Context window: largest' },
  { sort: 'providerCount', order: 'desc', label: 'Most providers' },
  { sort: 'name', order: 'asc', label: 'Name A → Z' },
];

const tokens = (n: number) => (n >= 1_000_000 ? `${n / 1_000_000}M` : `${Math.round(n / 1000)}K`);

@Injectable()
export class MetaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Everything a client needs to build navigation, filters, sort menus and labels — derived from the
   * database at request time, so options always match the data (no option without models, live counts).
   * All counts are read in one transaction, so they are mutually consistent.
   */
  async get() {
    const [types, statuses, inMods, outMods, orgs, providers, caps, categories, ctx, price, openWeights, totalModels] = await this.prisma.$transaction([
      this.prisma.model.groupBy({ by: ['type'], _count: { _all: true }, orderBy: { type: 'asc' } }),
      this.prisma.model.groupBy({ by: ['status'], _count: { _all: true }, orderBy: { status: 'asc' } }),
      this.prisma.$queryRaw<{ m: Modality; c: number }[]>`SELECT unnest("inputModalities")::text AS m, COUNT(*)::int AS c FROM "Model" GROUP BY 1 ORDER BY 1`,
      this.prisma.$queryRaw<{ m: Modality; c: number }[]>`SELECT unnest("outputModalities")::text AS m, COUNT(*)::int AS c FROM "Model" GROUP BY 1 ORDER BY 1`,
      this.prisma.organization.findMany({ select: { slug: true, name: true, _count: { select: { models: true } } }, orderBy: { nameSortKey: 'asc' } }),
      this.prisma.provider.findMany({ select: { slug: true, name: true, _count: { select: { offerings: { where: { isAvailable: true } } } } }, orderBy: { nameSortKey: 'asc' } }),
      this.prisma.capability.findMany({ select: { slug: true, name: true, _count: { select: { models: true } } }, orderBy: { name: 'asc' } }),
      this.prisma.$queryRaw<{ category: BenchmarkCategory; benchmarks: number; results: number }[]>`
        SELECT b."category"::text AS category, COUNT(DISTINCT b."id")::int AS benchmarks, COUNT(r."id")::int AS results
        FROM "Benchmark" b LEFT JOIN "BenchmarkResult" r ON r."benchmarkId" = b."id"
        GROUP BY 1 ORDER BY 1`,
      this.prisma.$queryRaw<{ min: number; c: number }[]>`
        SELECT t.min::int AS min, COUNT(m."id")::int AS c
        FROM unnest(${CONTEXT_BUCKETS}::int[]) AS t(min) LEFT JOIN "Model" m ON m."contextWindow" >= t.min
        GROUP BY t.min ORDER BY t.min`,
      this.prisma.model.aggregate({ _min: { minInputPrice: true }, _max: { minInputPrice: true } }),
      this.prisma.model.count({ where: { openWeights: true } }),
      this.prisma.model.count(),
    ]);

    return {
      enums: {
        modelTypes: enumOptions(LABELS.modelType),
        modelStatuses: enumOptions(LABELS.modelStatus),
        modalities: enumOptions(LABELS.modality),
        benchmarkCategories: enumOptions(LABELS.benchmarkCategory),
        organizationTypes: enumOptions(LABELS.organizationType),
        priceChanges: enumOptions(LABELS.priceChange),
      },
      facets: {
        totalModels,
        modelTypes: types.map((t) => ({ value: t.type, label: LABELS.modelType[t.type as ModelType], count: (t._count as { _all: number })._all })),
        statuses: statuses.map((s) => ({ value: s.status, label: LABELS.modelStatus[s.status as ModelStatus], count: (s._count as { _all: number })._all })),
        inputModalities: inMods.map((r) => ({ value: r.m, label: LABELS.modality[r.m], count: r.c })),
        outputModalities: outMods.map((r) => ({ value: r.m, label: LABELS.modality[r.m], count: r.c })),
        organizations: orgs.filter((o) => o._count.models > 0).map((o) => ({ slug: o.slug, name: o.name, count: o._count.models })),
        providers: providers.filter((p) => p._count.offerings > 0).map((p) => ({ slug: p.slug, name: p.name, count: p._count.offerings })),
        capabilities: caps.filter((c) => c._count.models > 0).map((c) => ({ slug: c.slug, name: c.name, count: c._count.models })),
        benchmarkCategories: categories
          .filter((c) => c.results > 0)
          .map((c) => ({ value: c.category, label: LABELS.benchmarkCategory[c.category], benchmarks: c.benchmarks, results: c.results })),
        contextWindows: ctx.filter((b) => b.c > 0).map((b) => ({ min: b.min, label: `≥ ${tokens(b.min)}`, count: b.c })),
        inputPrice: { min: dec(price._min.minInputPrice), max: dec(price._max.minInputPrice) },
        openWeights: openWeights,
      },
      sorts: MODEL_SORT_FIELDS.map((value) => ({ value, label: SORT_LABELS[value], defaultOrder: DEFAULT_ORDER[value] })),
      sortPresets: SORT_PRESETS,
      limits: { maxPageSize: MAX_PAGE_SIZE, compare: { min: MIN_COMPARE, max: MAX_COMPARE } },
    };
  }
}

@ApiTags('Meta')
@Controller('meta')
export class MetaController {
  constructor(private readonly meta: MetaService) {}

  @Get()
  @ApiOperation({
    summary: 'Labels, filter options with live counts, sort options and limits',
    description: 'Single source of truth for client UIs: every option is derived from the database, so clients never hard-code catalogue data.',
  })
  get() {
    return this.meta.get();
  }
}

@Module({ controllers: [MetaController], providers: [MetaService] })
export class MetaModule {}
