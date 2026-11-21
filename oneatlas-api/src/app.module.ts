import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppThrottlerGuard } from './common/guards/throttler.guard';
import { BenchmarksModule } from './benchmarks/benchmarks.module';
import { CapabilitiesModule } from './capabilities/capabilities.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { ConfigModule } from './config/config.module';
import { APP_CONFIG, AppConfig } from './config/env';
import { HealthModule } from './health/health.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { MetaModule } from './meta/meta.module';
import { ModelsModule } from './models/models.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PricingModule } from './pricing/pricing.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProvidersModule } from './providers/providers.module';
import { RankingsModule } from './rankings/rankings.module';
import { RootController } from './root.controller';
import { SearchModule } from './search/search.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => [{ ttl: config.rateLimit.ttlMs, limit: config.rateLimit.limit }],
    }),
    PrismaModule,
    PricingModule,
    ModelsModule,
    OrganizationsModule,
    ProvidersModule,
    BenchmarksModule,
    RankingsModule,
    CapabilitiesModule,
    SearchModule,
    StatsModule,
    IngestionModule,
    MetaModule,
    HealthModule,
  ],
  controllers: [RootController],
  providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
