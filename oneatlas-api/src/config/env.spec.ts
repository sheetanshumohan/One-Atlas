import { loadConfig } from './env';

const base = { DATABASE_URL: 'postgresql://u:p@localhost:5432/db' };

describe('loadConfig', () => {
  it('applies defaults', () => {
    const c = loadConfig({ ...base });
    expect(c).toMatchObject({ nodeEnv: 'development', port: 3000, adminApiKey: undefined, corsOrigins: '*', rateLimit: { ttlMs: 60000, limit: 300 } });
  });

  it('requires a postgres DATABASE_URL', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
    expect(() => loadConfig({ DATABASE_URL: 'mysql://x' })).toThrow(/postgres/);
    expect(() => loadConfig({ DATABASE_URL: 'postgres://x/y' })).not.toThrow();
  });

  it('validates numeric variables', () => {
    expect(() => loadConfig({ ...base, PORT: 'abc' })).toThrow(/PORT/);
    expect(() => loadConfig({ ...base, PORT: '0' })).toThrow(/PORT/);
    expect(() => loadConfig({ ...base, RATE_LIMIT_MAX: '-1' })).toThrow(/RATE_LIMIT_MAX/);
    expect(loadConfig({ ...base, PORT: '8080' }).port).toBe(8080);
    expect(loadConfig({ ...base, PORT: '' }).port).toBe(3000);
  });

  it('parses CORS origins', () => {
    expect(loadConfig({ ...base, CORS_ORIGINS: 'https://a.com, https://b.com' }).corsOrigins).toEqual(['https://a.com', 'https://b.com']);
    expect(loadConfig({ ...base, CORS_ORIGINS: '*' }).corsOrigins).toBe('*');
  });

  it('treats a blank admin key as "writes disabled"', () => {
    expect(loadConfig({ ...base, ADMIN_API_KEY: '   ' }).adminApiKey).toBeUndefined();
  });

  it('reads an optional trusted client key, enforcing length in production', () => {
    expect(loadConfig({ ...base }).trustedClientKey).toBeUndefined();
    expect(loadConfig({ ...base, TRUSTED_CLIENT_KEY: 'web' }).trustedClientKey).toBe('web');
    expect(() => loadConfig({ ...base, NODE_ENV: 'production', TRUSTED_CLIENT_KEY: 'short' })).toThrow(/TRUSTED_CLIENT_KEY/);
  });

  it('enforces a minimum admin key length in production only', () => {
    expect(() => loadConfig({ ...base, NODE_ENV: 'production', ADMIN_API_KEY: 'short' })).toThrow(/16/);
    expect(loadConfig({ ...base, NODE_ENV: 'production', ADMIN_API_KEY: 'x'.repeat(16) }).adminApiKey).toHaveLength(16);
    expect(loadConfig({ ...base, ADMIN_API_KEY: 'short' }).adminApiKey).toBe('short');
  });
});
