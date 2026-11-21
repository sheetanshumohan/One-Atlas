import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/utils/transforms';
import { IsSlug } from '../../common/validators';

export class CreateCapabilityDto {
  @ApiPropertyOptional({ example: 'tool-calling' })
  @IsOptional()
  @IsSlug()
  slug?: string;

  @ApiProperty({ example: 'Tool calling' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
