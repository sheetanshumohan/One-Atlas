import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { BenchmarkCategory } from '@prisma/client';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { ToUpperStringArray, Trim } from '../../common/utils/transforms';
import { IsSlug } from '../../common/validators';

export class ListBenchmarksQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BenchmarkCategory, isArray: true })
  @IsOptional()
  @ToUpperStringArray()
  @IsEnum(BenchmarkCategory, { each: true })
  category?: BenchmarkCategory[];
}

export class CreateBenchmarkDto {
  @ApiPropertyOptional({ example: 'mmlu-pro' })
  @IsOptional()
  @IsSlug()
  slug?: string;

  @ApiProperty({ example: 'MMLU-Pro' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ enum: BenchmarkCategory })
  @IsEnum(BenchmarkCategory)
  category: BenchmarkCategory;

  @ApiPropertyOptional({ default: '%' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 3 })
  minScore?: number;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 3 })
  maxScore?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  higherIsBetter?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(500)
  url?: string;
}

export class UpdateBenchmarkDto extends PartialType(CreateBenchmarkDto) {}
