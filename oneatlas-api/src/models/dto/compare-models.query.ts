import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsDefined } from 'class-validator';
import { ToStringArray } from '../../common/utils/transforms';
import { IsSlugArray } from '../../common/validators';

export const MIN_COMPARE = 2;
export const MAX_COMPARE = 6;

export class CompareModelsQueryDto {
  @ApiProperty({ description: `${MIN_COMPARE}–${MAX_COMPARE} model slugs, comma-separated`, example: 'gpt-4o,claude-3.5-sonnet' })
  @IsDefined({ message: 'models is required' })
  @ToStringArray()
  @ArrayMinSize(MIN_COMPARE, { message: `models must contain at least ${MIN_COMPARE} distinct slugs` })
  @ArrayMaxSize(MAX_COMPARE, { message: `models must contain at most ${MAX_COMPARE} slugs` })
  @IsSlugArray()
  models: string[];
}
