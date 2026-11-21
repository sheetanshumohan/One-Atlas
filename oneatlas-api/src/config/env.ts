export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  /** When undefined, every write endpoint is disabled (fail closed). */
  adminApiKey: string | undefined;
  /** Server-side clients (the web app) sending this in `x-client-key` bypass per-IP rate limiting. */
  trustedClientKey: string | undefined;
  corsOrigins: string[] | '*';
  rateLimit: { ttlMs: number; limit: number };
}

const MIN_PRODUCTION_KEY_LENGTH = 16;

function parsePositiveInt(name: string, raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid environment variable ${name}: expected a positive integer, got "${raw}"`);
  }
  return value;
}

/** Validates environment variables once at boot so misconfiguration fails fast and loudly. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV ?? 'development';

  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Missing required environment variable DATABASE_URL');
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    throw new Error('DATABASE_URL must be a postgres:// or postgresql:// connection string');
  }

  const adminApiKey = env.ADMIN_API_KEY?.trim() || undefined;
  if (nodeEnv === 'production' && adminApiKey && adminApiKey.length < MIN_PRODUCTION_KEY_LENGTH) {
    throw new Error(`ADMIN_API_KEY must be at least ${MIN_PRODUCTION_KEY_LENGTH} characters in production`);
  }

  const trustedClientKey = env.TRUSTED_CLIENT_KEY?.trim() || undefined;
  if (nodeEnv === 'production' && trustedClientKey && trustedClientKey.length < MIN_PRODUCTION_KEY_LENGTH) {
    throw new Error(`TRUSTED_CLIENT_KEY must be at least ${MIN_PRODUCTION_KEY_LENGTH} characters in production`);
  }

  const rawCors = env.CORS_ORIGINS?.trim();
  const corsOrigins: string[] | '*' =
    !rawCors || rawCors === '*' ? '*' : rawCors.split(',').map((o) => o.trim()).filter(Boolean);

  return {
    nodeEnv,
    port: parsePositiveInt('PORT', env.PORT, 3000),
    databaseUrl,
    adminApiKey,
    trustedClientKey,
    corsOrigins,
    rateLimit: {
      ttlMs: parsePositiveInt('RATE_LIMIT_TTL_MS', env.RATE_LIMIT_TTL_MS, 60_000),
      limit: parsePositiveInt('RATE_LIMIT_MAX', env.RATE_LIMIT_MAX, 300),
    },
  };
}

export const APP_CONFIG = Symbol('APP_CONFIG');
