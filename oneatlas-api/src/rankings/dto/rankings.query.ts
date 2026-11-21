import { ApiPropertyOptional } from '@nestjs/swagger';
import { BenchmarkCategory, ModelType } from '@prisma/client';
import { ArrayMaxSize, IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { ToBoolean, ToNumber, ToStringArray, ToUpperStringArray } from '../../common/utils/transforms';
import { IsSlug, IsSlugArray } from '../../common/validators';

export class RankingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Rank on a single benchmark', example: 'mmlu-pro' })
  @IsOptional()
  @IsSlug()
  benchmark?: string;

  @ApiPropertyOptional({ enum: BenchmarkCategory, description: 'Aggregate across all benchmarks in a category' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsEnum(BenchmarkCategory)
  category?: BenchmarkCategory;

  @ApiPropertyOptional({ enum: ModelType, isArray: true })
  @IsOptional()
  @ToUpperStringArray()
  @IsEnum(ModelType, { each: true })
  type?: ModelType[];

  @ApiPropertyOptional({ description: 'Organization slugs' })
  @IsOptional()
  @ToStringArray()
  @ArrayMaxSize(50)
  @IsSlugArray()
  organization?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  openWeights?: boolean;

  @ApiPropertyOptional({ description: 'Aggregate boards: minimum number of benchmarks a model must have', default: 1 })
  @IsOptional()
  @ToNumber()
  @IsInt()
  @Min(1)
  @Max(100)
  minBenchmarks?: number;
}
