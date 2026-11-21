import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests drive a real browser against the running web app (WEB_URL), which talks to the real
 * API + PostgreSQL seeded with `npm run db:seed` in oneatlas-api.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.WEB_URL ?? 'http://localhost:3001',
    trace: 'off',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
