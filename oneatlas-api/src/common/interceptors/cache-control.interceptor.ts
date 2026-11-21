import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

/**
 * Public catalogue reads are safe to cache briefly at the CDN/browser; writes are never cached.
 * Express additionally emits weak ETags so clients can revalidate with If-None-Match (304).
 */
@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      tap(() => {
        if (res.headersSent) return;
        if (req.method === 'GET' && !req.path.endsWith('/health')) {
          res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
        } else {
          res.setHeader('Cache-Control', 'no-store');
        }
      }),
    );
  }
}
