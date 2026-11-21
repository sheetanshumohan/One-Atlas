import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength } from 'class-validator';
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from './utils/slug';

export const IsSlug = () =>
  applyDecorators(
    IsString(),
    MaxLength(SLUG_MAX_LENGTH),
    Matches(SLUG_PATTERN, {
      message: '$property must be lowercase letters/digits separated by single "-" or "." (e.g. "gpt-4.1")',
    }),
  );

/** Each element is a valid slug (used for comma-separated slug filters). */
export const IsSlugArray = () =>
  applyDecorators(
    IsString({ each: true }),
    MaxLength(SLUG_MAX_LENGTH, { each: true }),
    Matches(SLUG_PATTERN, { each: true, message: 'each value in $property must be a valid slug' }),
  );
