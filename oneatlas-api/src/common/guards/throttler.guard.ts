import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { InjectThrottlerOptions, InjectThrottlerStorage, ThrottlerGuard, ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { APP_CONFIG, AppConfig } from '../../config/env';
import { safeEqual } from './admin-api-key.guard';

export const TRUSTED_CLIENT_HEADER = 'x-client-key';

/**
 * Per-IP rate limiting, except for trusted server-side clients (the OneAtlas web app).
 * Without this, every visitor of the web app would share the web server's single IP quota.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    reflector: Reflector,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {
    super(options, storage, reflector);
  }

  protected override async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const expected = this.config.trustedClientKey;
    if (!expected) return false;
    const provided = context.switchToHttp().getRequest<Request>().headers[TRUSTED_CLIENT_HEADER];
    return typeof provided === 'string' && provided.length > 0 && safeEqual(provided, expected);
  }
}
