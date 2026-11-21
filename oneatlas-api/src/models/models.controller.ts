import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiNoContentResponse, ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../common/decorators/admin.decorator';
import { CompareModelsQueryDto } from './dto/compare-models.query';
import { PriceHistoryQueryDto } from './dto/price-history.query';
import { ListModelsQueryDto } from './dto/list-models.query';
import { CreateModelDto, UpdateModelDto, UpsertBenchmarkResultDto, UpsertOfferingDto } from './dto/model-write.dto';
import { ModelsService } from './models.service';

@ApiTags('Models')
@Controller('models')
export class ModelsController {
  constructor(private readonly models: ModelsService) {}

  @Get()
  @ApiOperation({ summary: 'Search, filter, sort and paginate models' })
  list(@Query() query: ListModelsQueryDto) {
    return this.models.list(query);
  }

  // Declared before ':slug' so "compare" is not captured as a slug.
  @Get('compare')
  @ApiOperation({ summary: 'Compare 2–6 models side by side (pricing, context, capabilities, benchmarks)' })
  @ApiNotFoundResponse({ description: 'One or more models not found' })
  compare(@Query() query: CompareModelsQueryDto) {
    return this.models.compare(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Model detail: specs, pricing per provider, capabilities, benchmarks' })
  @ApiNotFoundResponse()
  findOne(@Param('slug') slug: string) {
    return this.models.findBySlug(slug);
  }

  @Get(':slug/providers')
  @ApiOperation({ summary: 'Providers serving this model, cheapest first' })
  offerings(@Param('slug') slug: string) {
    return this.models.listOfferings(slug);
  }

  @Get(':slug/price-history')
  @ApiOperation({ summary: 'Price change log for a model (newest first): created / updated / removed offerings' })
  priceHistory(@Param('slug') slug: string, @Query() q: PriceHistoryQueryDto) {
    return this.models.priceHistory(slug, q);
  }

  @Post()
  @AdminOnly()
  @ApiOperation({ summary: 'Create a model' })
  create(@Body() dto: CreateModelDto) {
    return this.models.create(dto);
  }

  @Patch(':slug')
  @AdminOnly()
  @ApiOperation({ summary: 'Partially update a model (capabilities, if sent, replace the full set)' })
  update(@Param('slug') slug: string, @Body() dto: UpdateModelDto) {
    return this.models.update(slug, dto);
  }

  @Delete(':slug')
  @AdminOnly()
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiOperation({ summary: 'Delete a model (cascades offerings and benchmark results)' })
  remove(@Param('slug') slug: string) {
    return this.models.remove(slug);
  }

  @Put(':slug/providers/:providerSlug')
  @AdminOnly()
  @ApiOperation({ summary: 'Create or replace the pricing/serving offering of a model on a provider' })
  upsertOffering(@Param('slug') slug: string, @Param('providerSlug') providerSlug: string, @Body() dto: UpsertOfferingDto) {
    return this.models.upsertOffering(slug, providerSlug, dto);
  }

  @Delete(':slug/providers/:providerSlug')
  @AdminOnly()
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a model from a provider' })
  removeOffering(@Param('slug') slug: string, @Param('providerSlug') providerSlug: string) {
    return this.models.removeOffering(slug, providerSlug);
  }

  @Put(':slug/benchmarks/:benchmarkSlug')
  @AdminOnly()
  @ApiOperation({ summary: 'Create or replace a benchmark score for a model' })
  upsertBenchmark(@Param('slug') slug: string, @Param('benchmarkSlug') benchmarkSlug: string, @Body() dto: UpsertBenchmarkResultDto) {
    return this.models.upsertBenchmarkResult(slug, benchmarkSlug, dto);
  }

  @Delete(':slug/benchmarks/:benchmarkSlug')
  @AdminOnly()
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a benchmark score' })
  removeBenchmark(@Param('slug') slug: string, @Param('benchmarkSlug') benchmarkSlug: string) {
    return this.models.removeBenchmarkResult(slug, benchmarkSlug);
  }
}
