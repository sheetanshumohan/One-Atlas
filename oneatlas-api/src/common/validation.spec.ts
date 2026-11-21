import { BadRequestException, ValidationError } from '@nestjs/common';
import { createValidationPipe, flattenValidationErrors } from './validation';

describe('flattenValidationErrors', () => {
  it('flattens nested errors into dotted field paths', () => {
    const errors: ValidationError[] = [
      { property: 'name', constraints: { isString: 'name must be a string' }, children: [] },
      {
        property: 'offering',
        children: [{ property: 'price', constraints: { min: 'price must not be less than 0', isNumber: 'price must be a number' }, children: [] }],
      },
    ];
    expect(flattenValidationErrors(errors)).toEqual([
      { field: 'name', messages: ['name must be a string'] },
      { field: 'offering.price', messages: ['price must not be less than 0', 'price must be a number'] },
    ]);
  });

  it('pipe exceptionFactory produces the VALIDATION_ERROR envelope', () => {
    const pipe = createValidationPipe() as unknown as { exceptionFactory: (e: ValidationError[]) => BadRequestException };
    const ex = pipe.exceptionFactory([{ property: 'q', constraints: { maxLength: 'too long' }, children: [] }]);
    expect(ex).toBeInstanceOf(BadRequestException);
    expect(ex.getResponse()).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: [{ field: 'q', messages: ['too long'] }],
    });
  });
});
