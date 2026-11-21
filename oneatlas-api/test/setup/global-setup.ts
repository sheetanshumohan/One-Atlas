import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { loadTestEnv } from './load-env';

/**
 * Applies all pending migrations to the test database once per e2e run (non-destructive).
 * Each suite then TRUNCATEs and re-seeds its own deterministic fixtures.
 */
export default async function globalSetup(): Promise<void> {
  loadTestEnv();
  execSync('npx prisma migrate deploy', {
    cwd: join(__dirname, '..', '..'),
    env: process.env,
    stdio: 'pipe',
  });
}
