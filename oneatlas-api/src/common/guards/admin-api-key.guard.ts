import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { APP_CONFIG, AppConfig } from '../../config/env';
import { ErrorCode } from '../errors';

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

/** Constant-time comparison (hashing first equalises lengths so length is not leaked either). */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

export function extractApiKey(req: Pick<Request, 'headers'>): string | undefined {
  const header = req.headers['x-api-key'];
  if (typeof header === 'string' && header.length > 0) return header;
  const auth = req.headers.authorization;
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim();
    return token.length > 0 ? token : undefined;
  }
  return undefined;
}

/**
 * Protects every write endpoint. Reads are public; writes need `x-api-key` (or `Authorization: Bearer`).
 * Fails closed: if no ADMIN_API_KEY is configured, writes are disabled entirely.
 */
@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.adminApiKey;
    if (!expected) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'Write API is disabled on this deployment' });
    }
    const provided = extractApiKey(context.switchToHttp().getRequest<Request>());
    if (!provided) {
      throw new UnauthorizedException({ code: ErrorCode.UNAUTHORIZED, message: 'Missing API key (x-api-key header)' });
    }
    if (!safeEqual(provided, expected)) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'Invalid API key' });
    }
    return true;
  }
}
