import { Module } from '@nestjs/common';
import { RankingsModule } from '../rankings/rankings.module';
import { BenchmarksController } from './benchmarks.controller';
import { BenchmarksService } from './benchmarks.service';

@Module({ imports: [RankingsModule], controllers: [BenchmarksController], providers: [BenchmarksService] })
export class BenchmarksModule {}
