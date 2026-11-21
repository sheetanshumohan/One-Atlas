import { Injectable } from '@nestjs/common';
import { Benchmark, Prisma } from '@prisma/client';
import { paginate, pageArgs } from '../common/dto/pagination.dto';
import { notFound, validationError } from '../common/errors';
import { isValidSlug, slugify } from '../common/utils/slug';
import { PrismaService } from '../prisma/prisma.service';
import { RankingsService } from '../rankings/rankings.service';
import { CreateBenchmarkDto, ListBenchmarksQueryDto, UpdateBenchmarkDto } from './dto/benchmark.dto';

type Row = Benchmark & { _count: { results: number } };

function present(b: Row) {
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    description: b.description,
    category: b.category,
    unit: b.unit,
    minScore: b.minScore.toNumber(),
    maxScore: b.maxScore.toNumber(),
    higherIsBetter: b.higherIsBetter,
    url: b.url,
    resultCount: b._count.results,
  };
}

const withCount = { _count: { select: { results: true } } } satisfies Prisma.BenchmarkInclude;

@Injectable()
export class BenchmarksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rankings: RankingsService,
  ) {}

  async list(q: ListBenchmarksQueryDto) {
    const where: Prisma.BenchmarkWhereInput = q.category?.length ? { category: { in: q.category } } : {};
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.benchmark.count({ where }),
      this.prisma.benchmark.findMany({ where, include: withCount, orderBy: [{ category: 'asc' }, { name: 'asc' }], ...pageArgs(q) }),
    ]);
    return paginate(rows.map(present), total, q);
  }

  async findBySlug(slug: string) {
    const b = await this.prisma.benchmark.findUnique({ where: { slug }, include: withCount });
    if (!b) throw notFound('Benchmark', slug);
    const board = await this.rankings.leaderboard({ benchmark: slug, page: 1, pageSize: 100 });
    return { ...present(b), leaderboard: board.data };
  }

  async create(dto: CreateBenchmarkDto) {
    const slug = dto.slug ?? slugify(dto.name);
    if (!isValidSlug(slug)) throw validationError('slug', 'Could not derive a valid slug from name; provide "slug" explicitly');
    this.assertRange(dto.minScore ?? 0, dto.maxScore ?? 100);
    return present(await this.prisma.benchmark.create({ data: { ...dto, slug }, include: withCount }));
  }

  async update(slug: string, dto: UpdateBenchmarkDto) {
    for (const key of ['slug', 'name', 'category', 'minScore', 'maxScore', 'higherIsBetter', 'unit'] as const) {
      if (dto[key] === null) throw validationError(key, `${key} cannot be null`);
    }
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.benchmark.findUnique({ where: { slug } });
      if (!existing) throw notFound('Benchmark', slug);
      const min = dto.minScore ?? existing.minScore.toNumber();
      const max = dto.maxScore ?? existing.maxScore.toNumber();
      this.assertRange(min, max);
      // Changing the scale must not orphan existing results outside it.
      const outOfRange = await tx.benchmarkResult.count({
        where: { benchmarkId: existing.id, OR: [{ score: { lt: min } }, { score: { gt: max } }] },
      });
      if (outOfRange > 0) {
        throw validationError('minScore', `${outOfRange} existing result(s) fall outside the new range [${min}, ${max}]`);
      }
      return present(await tx.benchmark.update({ where: { id: existing.id }, data: dto, include: withCount }));
    });
  }

  async remove(slug: string) {
    const { count } = await this.prisma.benchmark.deleteMany({ where: { slug } });
    if (count === 0) throw notFound('Benchmark', slug);
  }

  private assertRange(min: number, max: number) {
    if (!(max > min)) throw validationError('maxScore', 'maxScore must be greater than minScore');
  }
}
