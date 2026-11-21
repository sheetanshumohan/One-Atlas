/**
 * Prisma's `contains` compiles to ILIKE '%' || $1 || '%' WITHOUT escaping LIKE wildcards,
 * so a user typing "%" or "_" would match everything. Escape them (Postgres' default escape char is "\").
 */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export function containsInsensitive(q: string) {
  return { contains: escapeLike(q), mode: 'insensitive' as const };
}
