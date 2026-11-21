import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { OrganizationType } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min } from 'class-validator';
import { SortOrderDto } from '../../common/dto/pagination.dto';
import { Trim, ToUpperStringArray } from '../../common/utils/transforms';
import { Transform } from 'class-transformer';
import { IsSlug } from '../../common/validators';

const URL_OPTS = { require_protocol: true, protocols: ['http', 'https'] };

export const ORG_SORT_FIELDS = ['name', 'modelCount', 'foundedYear', 'createdAt'] as const;

export class ListOrganizationsQueryDto extends SortOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: OrganizationType, isArray: true })
  @IsOptional()
  @ToUpperStringArray()
  @IsEnum(OrganizationType, { each: true })
  type?: OrganizationType[];

  @ApiPropertyOptional({ description: 'ISO 3166-1 alpha-2 country code', example: 'US' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z]{2}$/, { message: 'country must be a 2-letter ISO code' })
  country?: string;

  @ApiPropertyOptional({ enum: ORG_SORT_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn(ORG_SORT_FIELDS)
  sort: (typeof ORG_SORT_FIELDS)[number] = 'name';
}

export class CreateOrganizationDto {
  @ApiPropertyOptional({ example: 'openai' })
  @IsOptional()
  @IsSlug()
  slug?: string;

  @ApiProperty({ example: 'OpenAI' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ enum: OrganizationType })
  @IsEnum(OrganizationType)
  type: OrganizationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: 'https://openai.com' })
  @IsOptional()
  @IsUrl(URL_OPTS)
  @MaxLength(500)
  website?: string;

  @ApiPropertyOptional({ example: 'US' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z]{2}$/, { message: 'country must be a 2-letter ISO code' })
  country?: string;

  @ApiPropertyOptional({ example: 2015 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  foundedYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl(URL_OPTS)
  @MaxLength(500)
  logoUrl?: string;
}

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {}
