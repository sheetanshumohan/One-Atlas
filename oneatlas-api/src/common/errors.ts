import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

/** Stable, machine-readable error codes returned in every error envelope. */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface FieldError {
  field: string;
  messages: string[];
}

export function notFound(entity: string, slug: string): NotFoundException {
  return new NotFoundException({ code: ErrorCode.NOT_FOUND, message: `${entity} '${slug}' not found` });
}

export function validationError(field: string, message: string): BadRequestException {
  return new BadRequestException({
    code: ErrorCode.VALIDATION_ERROR,
    message: 'Request validation failed',
    details: [{ field, messages: [message] } satisfies FieldError],
  });
}

export function conflict(message: string, details?: unknown): ConflictException {
  return new ConflictException({ code: ErrorCode.CONFLICT, message, details });
}
