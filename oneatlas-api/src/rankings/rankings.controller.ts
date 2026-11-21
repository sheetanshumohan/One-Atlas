import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RankingsQueryDto } from './dto/rankings.query';
import { RankingsService } from './rankings.service';

@ApiTags('Rankings & Leaderboards')
@Controller('rankings')
export class RankingsController {
  constructor(private readonly rankings: RankingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Leaderboard: by single benchmark, by benchmark category, or overall',
    description: 'Scores are normalised to 0–100 (higher is better) so different benchmark scales are comparable. Ties share a rank.',
  })
  leaderboard(@Query() q: RankingsQueryDto) {
    return this.rankings.leaderboard(q);
  }
}
