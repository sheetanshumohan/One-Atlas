import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';
import { ErrorCode, FieldError } from './errors';

export function flattenValidationErrors(errors: ValidationError[], parent = ''): FieldError[] {
  const out: FieldError[] = [];
  for (const err of errors) {
    const field = parent ? `${parent}.${err.property}` : err.property;
    if (err.constraints) out.push({ field, messages: Object.values(err.constraints) });
    if (err.children?.length) out.push(...flattenValidationErrors(err.children, field));
  }
  return out;
}

/**
 * Strict global validation:
 *  - whitelist + forbidNonWhitelisted: unknown fields are rejected, not silently dropped
 *  - transform: DTO classes are instantiated so @Transform/@Type run
 *  - implicit conversion is OFF on purpose ("false" would become true); conversions are explicit.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    validationError: { target: false, value: false },
    exceptionFactory: (errors) =>
      new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Request validation failed',
        details: flattenValidationErrors(errors),
      }),
  });
}
