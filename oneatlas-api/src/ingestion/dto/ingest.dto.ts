import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsOptional } from 'class-validator';
import { IsSlug } from '../../common/validators';

export const MAX_INGEST_BATCH = 1000;

export class IngestModelsDto {
  @ApiProperty({ description: 'Slug of the (existing) provider these prices come from', example: 'openrouter' })
  @IsSlug()
  provider: string;

  @ApiPropertyOptional({ default: false, description: 'Validate + normalise only; write nothing' })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @ApiProperty({
    description: 'Raw records in OpenRouter /api/v1/models format. Validated per record: one bad record never fails the batch.',
    type: 'array',
    items: { type: 'object' },
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_INGEST_BATCH)
  models: unknown[];
}
