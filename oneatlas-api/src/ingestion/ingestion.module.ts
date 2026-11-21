import { Body, Controller, HttpCode, Module, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../common/decorators/admin.decorator';
import { PricingService } from '../pricing/pricing.service';
import { IngestModelsDto } from './dto/ingest.dto';
import { IngestionService } from './ingestion.service';

@ApiTags('Ingestion (admin)')
@Controller('ingest')
export class IngestionController {
  constructor(
    private readonly ingestion: IngestionService,
    private readonly pricing: PricingService,
  ) {}

  @Post('models')
  @AdminOnly()
  @HttpCode(200)
  @ApiOperation({ summary: 'Ingest + normalise a raw model catalogue (OpenRouter format) for a provider' })
  ingest(@Body() dto: IngestModelsDto) {
    return this.ingestion.ingest(dto);
  }

  @Post('recompute-pricing')
  @AdminOnly()
  @HttpCode(200)
  @ApiOperation({ summary: 'Rebuild every model\'s denormalised pricing summary (consistency repair)' })
  async recompute() {
    return { modelsUpdated: await this.pricing.recomputeAll() };
  }
}

@Module({ controllers: [IngestionController], providers: [IngestionService], exports: [IngestionService] })
export class IngestionModule {}
