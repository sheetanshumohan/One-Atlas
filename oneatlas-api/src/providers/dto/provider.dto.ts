import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { SortOrderDto } from '../../common/dto/pagination.dto';
import { Trim } from '../../common/utils/transforms';
import { IsSlug } from '../../common/validators';

const URL_OPTS = { require_protocol: true, protocols: ['http', 'https'] };
export const PROVIDER_SORT_FIELDS = ['name', 'modelCount', 'createdAt'] as const;

export class ListProvidersQueryDto extends SortOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ description: 'Only providers currently serving this model slug', example: 'llama-3.1-70b-instruct' })
  @IsOptional()
  @IsSlug()
  model?: string;

  @ApiPropertyOptional({ enum: PROVIDER_SORT_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn(PROVIDER_SORT_FIELDS)
  sort: (typeof PROVIDER_SORT_FIELDS)[number] = 'name';
}

export class CreateProviderDto {
  @ApiPropertyOptional({ example: 'together-ai' })
  @IsOptional()
  @IsSlug()
  slug?: string;

  @ApiProperty({ example: 'Together AI' })
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

  @ApiPropertyOptional({ example: 'https://together.ai' })
  @IsOptional()
  @IsUrl(URL_OPTS)
  @MaxLength(500)
  website?: string;

  @ApiPropertyOptional({ example: 'https://api.together.xyz/v1' })
  @IsOptional()
  @IsUrl(URL_OPTS)
  @MaxLength(500)
  apiBaseUrl?: string;
}

export class UpdateProviderDto extends PartialType(CreateProviderDto) {}
