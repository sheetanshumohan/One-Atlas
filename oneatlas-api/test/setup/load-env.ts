import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Loads .env.test (if present) without overriding variables already set — so CI can inject its own
 * DATABASE_URL. Refuses to run against a database whose name does not look like a test database,
 * because the e2e suite TRUNCATEs every table.
 */
export function loadTestEnv(): void {
  const file = join(__dirname, '..', '..', '.env.test');
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  }
  process.env.NODE_ENV = 'test';
  process.env.RATE_LIMIT_MAX ??= '100000';
  const url = process.env.DATABASE_URL ?? '';
  const dbName = url.split('/').pop()?.split('?')[0] ?? '';
  if (!/test/i.test(dbName)) {
    throw new Error(`Refusing to run e2e tests against non-test database "${dbName}". Set DATABASE_URL to a *_test database.`);
  }
}
