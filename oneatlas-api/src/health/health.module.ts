import { Controller, Get, Injectable, Module, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ErrorCode } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    const started = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({ code: ErrorCode.SERVICE_UNAVAILABLE, message: 'Database unreachable' });
    }
    return { status: 'ok', database: 'up', dbLatencyMs: Date.now() - started, uptimeSec: Math.round(process.uptime()) };
  }
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness + database connectivity' })
  check() {
    return this.health.check();
  }
}

@Module({ controllers: [HealthController], providers: [HealthService] })
export class HealthModule {}
