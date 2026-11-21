import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [models, organizations, providers, benchmarks, offerings, results, byType, openWeights] = await this.prisma.$transaction([
      this.prisma.model.count(),
      this.prisma.organization.count(),
      this.prisma.provider.count(),
      this.prisma.benchmark.count(),
      this.prisma.modelProvider.count({ where: { isAvailable: true } }),
      this.prisma.benchmarkResult.count(),
      this.prisma.model.groupBy({ by: ['type'], _count: { _all: true }, orderBy: { type: 'asc' } }),
      this.prisma.model.count({ where: { openWeights: true } }),
    ]);
    return {
      totals: { models, organizations, providers, benchmarks, offerings, benchmarkResults: results, openWeightsModels: openWeights },
      modelsByType: Object.fromEntries(byType.map((r) => [r.type, (r._count as { _all: number })._all])),
    };
  }
}

@ApiTags('Stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  @ApiOperation({ summary: 'Catalogue totals' })
  overview() {
    return this.stats.overview();
  }
}

@Module({ controllers: [StatsController], providers: [StatsService] })
export class StatsModule {}
