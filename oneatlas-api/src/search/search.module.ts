import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import { ApiOperation, ApiPropertyOptional, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ToNumber, Trim } from '../common/utils/transforms';
import { containsInsensitive } from '../common/utils/search';
import { modelSummaryInclude, presentModelSummary } from '../models/model.presenter';
import { PrismaService } from '../prisma/prisma.service';

export class SearchQueryDto {
  @ApiProperty({ example: 'llama' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  q: string;

  @ApiPropertyOptional({ default: 5, minimum: 1, maximum: 20, description: 'Max hits per entity type' })
  @IsOptional()
  @ToNumber()
  @IsInt()
  @Min(1)
  @Max(20)
  limit: number = 5;
}

/** Lower is more relevant: exact > prefix > word-prefix > substring. */
export function relevance(q: string, ...fields: (string | null | undefined)[]): number {
  const needle = q.toLowerCase();
  let best = 4;
  for (const f of fields) {
    if (!f) continue;
    const hay = f.toLowerCase();
    if (hay === needle) best = Math.min(best, 0);
    else if (hay.startsWith(needle)) best = Math.min(best, 1);
    else if (hay.split(/[\s\-_.:/]+/).some((w) => w.startsWith(needle))) best = Math.min(best, 2);
    else if (hay.includes(needle)) best = Math.min(best, 3);
  }
  return best;
}

function rank<T extends { name: string; slug: string }>(q: string, rows: T[], limit: number): T[] {
  return rows
    .map((r) => ({ r, s: relevance(q, r.name, r.slug) }))
    .sort((a, b) => a.s - b.s || a.r.name.length - b.r.name.length || a.r.name.localeCompare(b.r.name))
    .slice(0, limit)
    .map((x) => x.r);
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search({ q, limit }: SearchQueryDto) {
    const contains = containsInsensitive(q);
    const fetch = limit * 4; // over-fetch, then re-rank by relevance
    const [models, organizations, providers, benchmarks] = await Promise.all([
      this.prisma.model.findMany({
        where: { OR: [{ name: contains }, { slug: contains }] },
        include: modelSummaryInclude,
        take: fetch,
        orderBy: { nameSortKey: 'asc' },
      }),
      this.prisma.organization.findMany({
        where: { OR: [{ name: contains }, { slug: contains }] },
        select: { slug: true, name: true, type: true },
        take: fetch,
        orderBy: { nameSortKey: 'asc' },
      }),
      this.prisma.provider.findMany({
        where: { OR: [{ name: contains }, { slug: contains }] },
        select: { slug: true, name: true },
        take: fetch,
        orderBy: { nameSortKey: 'asc' },
      }),
      this.prisma.benchmark.findMany({
        where: { OR: [{ name: contains }, { slug: contains }] },
        select: { slug: true, name: true, category: true },
        take: fetch,
        orderBy: { name: 'asc' },
      }),
    ]);
    const m = rank(q, models, limit).map(presentModelSummary);
    const o = rank(q, organizations, limit);
    const p = rank(q, providers, limit);
    const b = rank(q, benchmarks, limit);
    return {
      query: q,
      total: m.length + o.length + p.length + b.length,
      models: m,
      organizations: o,
      providers: p,
      benchmarks: b,
    };
  }
}

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global search across models, organizations, providers and benchmarks' })
  search(@Query() q: SearchQueryDto) {
    return this.service.search(q);
  }
}

@Module({ controllers: [SearchController], providers: [SearchService] })
export class SearchModule {}
