import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginate } from '../common/dto/pagination.dto';
import { notFound, validationError } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { RankingsQueryDto } from './dto/rankings.query';
import { buildLeaderboard } from './leaderboard';

@Injectable()
export class RankingsService {
  constructor(private readonly prisma: PrismaService) {}

  async leaderboard(q: RankingsQueryDto) {
    if (q.benchmark && q.category) {
      throw validationError('benchmark', 'Use either benchmark or category, not both');
    }

    const benchWhere: Prisma.BenchmarkWhereInput = q.benchmark ? { slug: q.benchmark } : q.category ? { category: q.category } : {};
    const benchmarks = await this.prisma.benchmark.findMany({ where: benchWhere, orderBy: { slug: 'asc' } });
    if (q.benchmark && benchmarks.length === 0) throw notFound('Benchmark', q.benchmark);

    const modelWhere: Prisma.ModelWhereInput = {
      ...(q.type?.length ? { type: { in: q.type } } : {}),
      ...(q.organization?.length ? { organization: { slug: { in: q.organization } } } : {}),
      ...(q.openWeights !== undefined ? { openWeights: q.openWeights } : {}),
    };

    const results = await this.prisma.benchmarkResult.findMany({
      where: { benchmarkId: { in: benchmarks.map((b) => b.id) }, model: modelWhere },
      select: {
        score: true,
        benchmark: { select: { slug: true, minScore: true, maxScore: true, higherIsBetter: true } },
        model: { select: { slug: true, name: true } },
      },
    });

    const board = buildLeaderboard(
      results.map((r) => ({
        modelSlug: r.model.slug,
        modelName: r.model.name,
        benchmarkSlug: r.benchmark.slug,
        score: r.score.toNumber(),
        scale: {
          minScore: r.benchmark.minScore.toNumber(),
          maxScore: r.benchmark.maxScore.toNumber(),
          higherIsBetter: r.benchmark.higherIsBetter,
        },
      })),
      { minCoverage: q.benchmark ? 1 : q.minBenchmarks },
    );

    // Enrich only the requested page with model metadata (bounded query size).
    const start = (q.page - 1) * q.pageSize;
    const page = board.slice(start, start + q.pageSize);
    const models = await this.prisma.model.findMany({
      where: { slug: { in: page.map((e) => e.modelSlug) } },
      select: { slug: true, type: true, openWeights: true, organization: { select: { slug: true, name: true } } },
    });
    const meta = new Map(models.map((m) => [m.slug, m]));

    return {
      scope: {
        kind: q.benchmark ? 'benchmark' : q.category ? 'category' : 'overall',
        benchmark: q.benchmark ?? null,
        category: q.category ?? null,
        benchmarks: benchmarks.map((b) => ({ slug: b.slug, name: b.name, category: b.category, higherIsBetter: b.higherIsBetter, unit: b.unit })),
      },
      ...paginate(
        page.map((e) => {
          const m = meta.get(e.modelSlug);
          return {
            rank: e.rank,
            model: { slug: e.modelSlug, name: e.modelName, type: m?.type ?? null, openWeights: m?.openWeights ?? null, organization: m?.organization ?? null },
            score: e.score,
            benchmarksCovered: e.benchmarksCovered,
            results: e.results,
          };
        }),
        board.length,
        q,
      ),
    };
  }
}
