import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { ErrorCode } from '../errors';

export interface ErrorBody {
  statusCode: number;
  error: { code: string; message: string; details?: unknown };
  path: string;
  timestamp: string;
  requestId?: string;
}

interface Normalized {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  400: ErrorCode.BAD_REQUEST,
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.CONFLICT,
  413: ErrorCode.PAYLOAD_TOO_LARGE,
  429: ErrorCode.RATE_LIMITED,
  503: ErrorCode.SERVICE_UNAVAILABLE,
};

/**
 * Single place that turns *any* thrown value into the public error envelope.
 * Database errors are translated into meaningful HTTP statuses and internal details
 * (SQL, stack traces) are never leaked to clients.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const n = this.normalize(exception);
    if (n.status >= 500) {
      this.logger.error(
        `${req.method} ${req.originalUrl} -> ${n.status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    // Errors thrown before middleware ran (e.g. malformed JSON in the body parser) still get a request id.
    const r = req as Request & { id?: string };
    if (!r.id) {
      const incoming = req.headers?.['x-request-id'];
      r.id = typeof incoming === 'string' && /^[A-Za-z0-9._-]{1,128}$/.test(incoming) ? incoming : randomUUID();
      if (!res.headersSent) res.setHeader('X-Request-Id', r.id);
    }

    const body: ErrorBody = {
      statusCode: n.status,
      error: { code: n.code, message: n.message, ...(n.details !== undefined ? { details: n.details } : {}) },
      path: req.originalUrl ?? req.url,
      timestamp: new Date().toISOString(),
      requestId: r.id,
    };
    if (!res.headersSent) res.status(n.status).json(body);
  }

  normalize(exception: unknown): Normalized {
    if (exception instanceof HttpException) return this.fromHttp(exception);
    if (exception instanceof Prisma.PrismaClientKnownRequestError) return this.fromPrismaKnown(exception);
    const clientError = this.fromHttpErrorsObject(exception);
    if (clientError) return clientError;
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return { status: 400, code: ErrorCode.BAD_REQUEST, message: 'Invalid query or data shape' };
    }
    if (
      exception instanceof Prisma.PrismaClientInitializationError ||
      exception instanceof Prisma.PrismaClientRustPanicError
    ) {
      return { status: 503, code: ErrorCode.SERVICE_UNAVAILABLE, message: 'Database unavailable' };
    }
    if (exception instanceof Prisma.PrismaClientUnknownRequestError && /check constraint/i.test(exception.message)) {
      return { status: 400, code: ErrorCode.CONSTRAINT_VIOLATION, message: 'Data violates a database constraint' };
    }
    return { status: 500, code: ErrorCode.INTERNAL_ERROR, message: 'Internal server error' };
  }

  private fromHttp(exception: HttpException): Normalized {
    const status = exception.getStatus();
    const response = exception.getResponse();
    const fallbackCode = STATUS_TO_CODE[status] ?? (status >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.BAD_REQUEST);

    if (typeof response === 'string') return { status, code: fallbackCode, message: response };

    const r = response as { code?: string; message?: string | string[]; details?: unknown; error?: string };
    // Body-parser errors (malformed JSON / too large) surface as HttpExceptions with plain messages.
    const message = Array.isArray(r.message) ? r.message.join('; ') : (r.message ?? exception.message);
    return { status, code: r.code ?? fallbackCode, message, details: r.details };
  }

  /**
   * body-parser / express raise `http-errors` objects (not Nest HttpExceptions) for oversized or
   * malformed bodies. They carry `status` and `expose: true` for client errors.
   */
  private fromHttpErrorsObject(exception: unknown): Normalized | null {
    if (!exception || typeof exception !== 'object') return null;
    const e = exception as { status?: unknown; statusCode?: unknown; expose?: unknown; type?: unknown; message?: unknown };
    const status = typeof e.status === 'number' ? e.status : typeof e.statusCode === 'number' ? e.statusCode : undefined;
    if (status === undefined || status < 400 || status >= 500 || e.expose !== true) return null;
    if (e.type === 'entity.too.large') return { status: 413, code: ErrorCode.PAYLOAD_TOO_LARGE, message: 'Request body too large (max 2MB)' };
    if (e.type === 'entity.parse.failed') return { status: 400, code: ErrorCode.BAD_REQUEST, message: 'Malformed JSON body' };
    return { status, code: STATUS_TO_CODE[status] ?? ErrorCode.BAD_REQUEST, message: typeof e.message === 'string' ? e.message : 'Bad request' };
  }

  private fromPrismaKnown(e: Prisma.PrismaClientKnownRequestError): Normalized {
    switch (e.code) {
      case 'P2002': {
        const target = (e.meta?.target as string[] | string | undefined) ?? [];
        const fields = Array.isArray(target) ? target : [target];
        return {
          status: 409,
          code: ErrorCode.CONFLICT,
          message: `A record with the same ${fields.join(', ') || 'unique field'} already exists`,
          details: { fields },
        };
      }
      case 'P2025':
        return { status: 404, code: ErrorCode.NOT_FOUND, message: 'Record not found' };
      case 'P2003':
        return {
          status: 409,
          code: ErrorCode.CONFLICT,
          message: 'Operation violates a relation constraint (the record is referenced by, or references, another record)',
        };
      case 'P2000':
        return { status: 400, code: ErrorCode.VALIDATION_ERROR, message: 'A provided value is too long for its field' };
      case 'P2004':
      case 'P2011':
      case 'P2020':
        return { status: 400, code: ErrorCode.CONSTRAINT_VIOLATION, message: 'Data violates a database constraint' };
      case 'P2024':
        return { status: 503, code: ErrorCode.SERVICE_UNAVAILABLE, message: 'Database connection pool timeout' };
      default:
        return { status: 500, code: ErrorCode.INTERNAL_ERROR, message: 'Internal server error' };
    }
  }
}

