import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { IsSlug } from '../../common/validators';

export class PriceHistoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Only events for this provider slug', example: 'openai-api' })
  @IsOptional()
  @IsSlug()
  provider?: string;
}
