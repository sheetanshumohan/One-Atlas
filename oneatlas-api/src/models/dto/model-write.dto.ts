import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Modality, ModelStatus, ModelType } from '@prisma/client';
import {
  ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty,
  IsNumber, IsOptional, IsString, IsUrl, Max, MaxLength, Min,
} from 'class-validator';
import { Trim } from '../../common/utils/transforms';
import { IsSlug, IsSlugArray } from '../../common/validators';

export class CreateModelDto {
  @ApiPropertyOptional({ description: 'Derived from name when omitted', example: 'gpt-4o' })
  @IsOptional()
  @IsSlug()
  slug?: string;

  @ApiProperty({ example: 'GPT-4o' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'openai' })
  @IsSlug()
  organization: string;

  @ApiProperty({ enum: ModelType })
  @IsEnum(ModelType)
  type: ModelType;

  @ApiPropertyOptional({ enum: ModelStatus, default: ModelStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ModelStatus)
  status?: ModelStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: '2024-05-13' })
  @IsOptional()
  @IsDateString({ strict: true })
  releaseDate?: string;

  @ApiPropertyOptional({ example: '2023-10-01' })
  @IsOptional()
  @IsDateString({ strict: true })
  knowledgeCutoff?: string;

  @ApiPropertyOptional({ example: 128000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  contextWindow?: number;

  @ApiPropertyOptional({ example: 16384 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  maxOutputTokens?: number;

  @ApiPropertyOptional({ description: 'Billions of parameters', example: 70 })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99_999_999)
  parameterCountB?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  openWeights?: boolean;

  @ApiPropertyOptional({ example: 'Proprietary' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  license?: string;

  @ApiProperty({ enum: Modality, isArray: true, example: ['TEXT', 'IMAGE'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(Modality, { each: true })
  inputModalities: Modality[];

  @ApiProperty({ enum: Modality, isArray: true, example: ['TEXT'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(Modality, { each: true })
  outputModalities: Modality[];

  @ApiPropertyOptional({ description: 'Capability slugs (must already exist)', example: ['tool-calling', 'vision'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsSlugArray()
  capabilities?: string[];
}

export class UpdateModelDto extends PartialType(CreateModelDto) {}

export class UpsertOfferingDto {
  @ApiProperty({ example: 'gpt-4o-2024-08-06', description: "Model identifier in the provider's API" })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  providerModelId: string;

  @ApiProperty({ example: 2.5, description: 'USD per 1M input tokens' })
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 6 })
  @Min(0)
  @Max(1_000_000)
  inputPricePerMTok: number;

  @ApiProperty({ example: 10, description: 'USD per 1M output tokens' })
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 6 })
  @Min(0)
  @Max(1_000_000)
  outputPricePerMTok: number;

  @ApiPropertyOptional({ example: 1.25, description: 'USD per 1M cached input tokens (≤ input price)' })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 6 })
  @Min(0)
  @Max(1_000_000)
  cachedInputPerMTok?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  contextWindow?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  maxOutputTokens?: number;

  @ApiPropertyOptional({ description: 'Median time to first token (ms)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600_000)
  avgLatencyMs?: number;

  @ApiPropertyOptional({ description: 'Tokens per second' })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  throughputTps?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  uptimePct?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class UpsertBenchmarkResultDto {
  @ApiProperty({ example: 88.7 })
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 3 })
  score: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(500)
  sourceUrl?: string;

  @ApiPropertyOptional({ example: '2024-06-01' })
  @IsOptional()
  @IsDateString({ strict: true })
  measuredAt?: string;
}
