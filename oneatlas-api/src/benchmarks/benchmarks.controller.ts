import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../common/decorators/admin.decorator';
import { BenchmarksService } from './benchmarks.service';
import { CreateBenchmarkDto, ListBenchmarksQueryDto, UpdateBenchmarkDto } from './dto/benchmark.dto';

@ApiTags('Benchmarks')
@Controller('benchmarks')
export class BenchmarksController {
  constructor(private readonly benchmarks: BenchmarksService) {}

  @Get()
  @ApiOperation({ summary: 'List benchmarks (filter by category)' })
  list(@Query() q: ListBenchmarksQueryDto) {
    return this.benchmarks.list(q);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Benchmark detail with its leaderboard' })
  findOne(@Param('slug') slug: string) {
    return this.benchmarks.findBySlug(slug);
  }

  @Post()
  @AdminOnly()
  create(@Body() dto: CreateBenchmarkDto) {
    return this.benchmarks.create(dto);
  }

  @Patch(':slug')
  @AdminOnly()
  update(@Param('slug') slug: string, @Body() dto: UpdateBenchmarkDto) {
    return this.benchmarks.update(slug, dto);
  }

  @Delete(':slug')
  @AdminOnly()
  @HttpCode(204)
  remove(@Param('slug') slug: string) {
    return this.benchmarks.remove(slug);
  }
}
