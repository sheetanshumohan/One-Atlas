import { Prisma } from '@prisma/client';

/** Prisma returns NUMERIC columns as Decimal; the public API exposes plain JSON numbers. */
export function dec(value: Prisma.Decimal | null | undefined): number | null {
  return value === null || value === undefined ? null : value.toNumber();
}

export function isoDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}
