import { ApiPropertyOptional } from '@nestjs/swagger';
import { Modality, ModelStatus, ModelType } from '@prisma/client';
import { ArrayMaxSize, IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { SortOrderDto } from '../../common/dto/pagination.dto';
import { ToBoolean, ToNumber, ToStringArray, ToUpperStringArray, Trim } from '../../common/utils/transforms';
import { IsSlugArray } from '../../common/validators';

export const MODEL_SORT_FIELDS = ['releaseDate', 'name', 'contextWindow', 'inputPrice', 'outputPrice', 'providerCount', 'createdAt'] as const;
export type ModelSortField = (typeof MODEL_SORT_FIELDS)[number];

/** Natural default direction per field: cheapest first, biggest/newest first, A→Z. */
export const DEFAULT_ORDER: Record<ModelSortField, 'asc' | 'desc'> = {
  releaseDate: 'desc',
  name: 'asc',
  contextWindow: 'desc',
  inputPrice: 'asc',
  outputPrice: 'asc',
  providerCount: 'desc',
  createdAt: 'desc',
};

const MAX_FILTER_VALUES = 50;

export class ListModelsQueryDto extends SortOrderDto {
  @ApiPropertyOptional({ description: 'Case-insensitive search over name, slug, description and organization name' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ description: 'Organization (company/lab) slugs, comma-separated — matches ANY', example: 'openai,anthropic' })
  @IsOptional()
  @ToStringArray()
  @ArrayMaxSize(MAX_FILTER_VALUES)
  @IsSlugArray()
  organization?: string[];

  @ApiPropertyOptional({ description: 'Provider slugs — models available on ANY of them', example: 'aws-bedrock' })
  @IsOptional()
  @ToStringArray()
  @ArrayMaxSize(MAX_FILTER_VALUES)
  @IsSlugArray()
  provider?: string[];

  @ApiPropertyOptional({ description: 'Capability slugs — model must have ALL of them', example: 'tool-calling,vision' })
  @IsOptional()
  @ToStringArray()
  @ArrayMaxSize(MAX_FILTER_VALUES)
  @IsSlugArray()
  capability?: string[];

  @ApiPropertyOptional({ enum: ModelType, isArray: true, description: 'Model types — matches ANY' })
  @IsOptional()
  @ToUpperStringArray()
  @IsEnum(ModelType, { each: true })
  type?: ModelType[];

  @ApiPropertyOptional({ enum: ModelStatus, isArray: true })
  @IsOptional()
  @ToUpperStringArray()
  @IsEnum(ModelStatus, { each: true })
  status?: ModelStatus[];

  @ApiPropertyOptional({ enum: Modality, isArray: true, description: 'Input modalities — model must accept ALL' })
  @IsOptional()
  @ToUpperStringArray()
  @IsEnum(Modality, { each: true })
  inputModality?: Modality[];

  @ApiPropertyOptional({ enum: Modality, isArray: true, description: 'Output modalities — model must produce ALL' })
  @IsOptional()
  @ToUpperStringArray()
  @IsEnum(Modality, { each: true })
  outputModality?: Modality[];

  @ApiPropertyOptional()
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  openWeights?: boolean;

  @ApiPropertyOptional({ description: 'Minimum context window (tokens)' })
  @IsOptional()
  @ToNumber()
  @IsInt()
  @Min(1)
  minContext?: number;

  @ApiPropertyOptional({ description: 'Maximum context window (tokens)' })
  @IsOptional()
  @ToNumber()
  @IsInt()
  @Min(1)
  maxContext?: number;

  @ApiPropertyOptional({ description: 'Max cheapest input price, USD / 1M tokens' })
  @IsOptional()
  @ToNumber()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  maxInputPrice?: number;

  @ApiPropertyOptional({ description: 'Max cheapest output price, USD / 1M tokens' })
  @IsOptional()
  @ToNumber()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  maxOutputPrice?: number;

  @ApiPropertyOptional({ description: 'ISO date (inclusive)', example: '2024-01-01' })
  @IsOptional()
  @IsDateString({ strict: true })
  releasedAfter?: string;

  @ApiPropertyOptional({ description: 'ISO date (inclusive)', example: '2025-12-31' })
  @IsOptional()
  @IsDateString({ strict: true })
  releasedBefore?: string;

  @ApiPropertyOptional({ enum: MODEL_SORT_FIELDS, default: 'releaseDate' })
  @IsOptional()
  @IsIn(MODEL_SORT_FIELDS)
  sort: ModelSortField = 'releaseDate';
}
