import request from 'supertest';
import { ADMIN_KEY, createTestApp, TestApp } from './helpers/app';
import { seedFixtures } from './helpers/fixtures';

describe('Platform: auth, error envelope, headers, limits, rate limiting (e2e)', () => {
  let t: TestApp;
  const http = () => request(t.app.getHttpServer());

  beforeAll(async () => {
    t = await createTestApp();
    await seedFixtures(t.prisma);
  });
  afterAll(() => t.close());

  describe('authentication of write endpoints', () => {
    const writes: Array<[string, string, object | null]> = [
      ['post', '/api/v1/models', {}],
      ['patch', '/api/v1/models/alpha-1', {}],
      ['delete', '/api/v1/models/alpha-1', null],
      ['put', '/api/v1/models/alpha-1/providers/cloud-a', {}],
      ['delete', '/api/v1/models/alpha-1/providers/cloud-a', null],
      ['put', '/api/v1/models/alpha-1/benchmarks/know-1', {}],
      ['delete', '/api/v1/models/alpha-1/benchmarks/know-1', null],
      ['post', '/api/v1/organizations', {}],
      ['patch', '/api/v1/organizations/alpha-lab', {}],
      ['delete', '/api/v1/organizations/gamma-labs', null],
      ['post', '/api/v1/providers', {}],
      ['patch', '/api/v1/providers/cloud-a', {}],
      ['delete', '/api/v1/providers/cloud-c', null],
      ['post', '/api/v1/benchmarks', {}],
      ['patch', '/api/v1/benchmarks/know-1', {}],
      ['delete', '/api/v1/benchmarks/know-1', null],
      ['post', '/api/v1/capabilities', {}],
      ['post', '/api/v1/ingest/models', {}],
      ['post', '/api/v1/ingest/recompute-pricing', null],
    ];

    it.each(writes)('%s %s → 401 without key, 403 with wrong key (auth runs before validation)', async (method, url, body) => {
      const call = (headers: Record<string, string>) => {
        const r = (http() as unknown as Record<string, (u: string) => request.Test>)[method](url).set(headers);
        return body ? r.send(body) : r;
      };
      const noKey = await call({}).expect(401);
      expect(noKey.body.error.code).toBe('UNAUTHORIZED');
      const wrong = await call({ 'x-api-key': 'wrong-key' }).expect(403);
      expect(wrong.body.error.code).toBe('FORBIDDEN');
    });

    it('accepts Authorization: Bearer as well as x-api-key', async () => {
      await http().patch('/api/v1/organizations/gamma-labs').set('Authorization', `Bearer ${ADMIN_KEY}`).send({ description: 'via bearer' }).expect(200);
    });

    it('all GET endpoints are public', async () => {
      for (const url of ['/models', '/models/alpha-1', '/models/compare?models=alpha-1,alpha-2', '/organizations', '/providers', '/benchmarks', '/rankings', '/capabilities', '/search?q=a', '/stats', '/health']) {
        await http().get(`/api/v1${url}`).expect(200);
      }
    });
  });

  describe('error envelope & request tracing', () => {
    it('every error has the same shape', async () => {
      const res = await http().get('/api/v1/models/ghost').expect(404);
      expect(Object.keys(res.body).sort()).toEqual(['error', 'path', 'requestId', 'statusCode', 'timestamp']);
      expect(res.body.requestId).toBe(res.headers['x-request-id']);
    });

    it('unknown routes return a JSON 404 envelope', async () => {
      const res = await http().get('/api/v1/nope').expect(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('echoes a well-formed X-Request-Id and replaces malicious ones', async () => {
      const ok = await http().get('/api/v1/health').set('X-Request-Id', 'trace-abc.123').expect(200);
      expect(ok.headers['x-request-id']).toBe('trace-abc.123');
      const bad = await http().get('/api/v1/health').set('X-Request-Id', '<script>alert(1)</script>').expect(200);
      expect(bad.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('malformed JSON → 400 envelope (with request id)', async () => {
      const res = await http().post('/api/v1/organizations').set('x-api-key', ADMIN_KEY).set('Content-Type', 'application/json').send('{"name": ').expect(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.requestId).toEqual(expect.any(String));
    });

    it('bodies over 2MB → 413 envelope', async () => {
      const huge = JSON.stringify({ provider: 'cloud-c', models: [{ id: 'a/b', description: 'x'.repeat(2_200_000) }] });
      const res = await http().post('/api/v1/ingest/models').set('x-api-key', ADMIN_KEY).set('Content-Type', 'application/json').send(huge).expect(413);
      expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    });

    it('arrays where objects are expected / prototype pollution attempts are rejected', async () => {
      await http().post('/api/v1/organizations').set('x-api-key', ADMIN_KEY).send([{ name: 'x' }]).expect(400);
      const res = await http()
        .post('/api/v1/organizations')
        .set('x-api-key', ADMIN_KEY)
        .set('Content-Type', 'application/json')
        .send('{"name":"Proto","type":"STARTUP","__proto__":{"admin":true}}');
      expect([201, 400]).toContain(res.status);
      expect(({} as Record<string, unknown>).admin).toBeUndefined();
    });

    it('SQL-injection-looking input is treated as data', async () => {
      const res = await http().get(`/api/v1/models?q=${encodeURIComponent("'; DROP TABLE \"Model\"; --")}`).expect(200);
      expect(res.body.data).toEqual([]);
      expect(await t.prisma.model.count()).toBe(5);
    });
  });

  describe('HTTP caching & security headers', () => {
    it('GET responses are cacheable with ETag; If-None-Match yields 304', async () => {
      const first = await http().get('/api/v1/models/alpha-1').expect(200);
      expect(first.headers['cache-control']).toContain('max-age=30');
      expect(first.headers.etag).toBeDefined();
      await http().get('/api/v1/models/alpha-1').set('If-None-Match', first.headers.etag).expect(304);
    });

    it('writes are not cacheable', async () => {
      const res = await http().patch('/api/v1/organizations/gamma-labs').set('x-api-key', ADMIN_KEY).send({ description: 'x' }).expect(200);
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('sets helmet security headers and hides the framework', async () => {
      const res = await http().get('/api/v1/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('CORS preflight is answered', async () => {
      const res = await http().options('/api/v1/models').set('Origin', 'https://app.example.com').set('Access-Control-Request-Method', 'GET').expect(204);
      expect(res.headers['access-control-allow-origin']).toBe('https://app.example.com');
    });

    it('gzip compression for large responses', async () => {
      const res = await http().get('/api/v1/models?pageSize=100').set('Accept-Encoding', 'gzip').expect(200);
      expect(res.headers['content-encoding']).toBe('gzip');
    });
  });

  describe('reliability', () => {
    it('health returns 503 (not 500) when the database is unreachable', async () => {
      const spy = jest.spyOn(t.prisma, '$queryRaw').mockRejectedValueOnce(new Error('connection refused'));
      try {
        const res = await http().get('/api/v1/health').expect(503);
        expect(res.body.error).toEqual({ code: 'SERVICE_UNAVAILABLE', message: 'Database unreachable' });
      } finally {
        spy.mockRestore();
      }
    });

    it('unexpected errors become a 500 envelope without leaking internals', async () => {
      const spy = jest.spyOn(t.prisma.model, 'findUnique').mockRejectedValueOnce(new Error('SELECT secret FROM internals'));
      try {
        const res = await http().get('/api/v1/models/alpha-1').expect(500);
        expect(res.body.error).toEqual({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
        expect(JSON.stringify(res.body)).not.toContain('secret');
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('API docs & root', () => {
    it('serves the OpenAPI document describing every resource', async () => {
      const res = await http().get('/docs-json').expect(200);
      expect(res.body.openapi).toMatch(/^3\./);
      const paths = Object.keys(res.body.paths);
      for (const p of ['/api/v1/models', '/api/v1/models/compare', '/api/v1/models/{slug}', '/api/v1/rankings', '/api/v1/ingest/models']) expect(paths).toContain(p);
      expect(res.body.components.securitySchemes['admin-api-key']).toMatchObject({ type: 'apiKey', in: 'header', name: 'x-api-key' });
    });

    it('serves Swagger UI and a root index', async () => {
      await http().get('/docs').expect(200).expect('Content-Type', /html/);
      const root = await http().get('/').expect(200);
      expect(root.body).toMatchObject({ name: 'OneAtlas API', docs: '/docs' });
    });
  });
});

describe('Platform: fail-closed writes & rate limiting (separately configured apps)', () => {
  it('when no ADMIN_API_KEY is configured every write is disabled (403) but reads work', async () => {
    const t = await createTestApp({ adminApiKey: undefined });
    try {
      const res = await request(t.app.getHttpServer()).post('/api/v1/organizations').set('x-api-key', 'anything').send({ name: 'x', type: 'AI_LAB' }).expect(403);
      expect(res.body.error.message).toMatch(/disabled/);
      await request(t.app.getHttpServer()).get('/api/v1/models').expect(200);
    } finally {
      await t.close();
    }
  });

  it('trusted server-side clients (the web app) bypass the per-IP limit; wrong keys do not', async () => {
    const t = await createTestApp({ rateLimit: { ttlMs: 60_000, limit: 2 }, trustedClientKey: 'web-app-trusted-key' });
    try {
      const server = t.app.getHttpServer();
      for (let i = 0; i < 6; i++) await request(server).get('/api/v1/health').set('x-client-key', 'web-app-trusted-key').expect(200);
      await request(server).get('/api/v1/health').set('x-client-key', 'wrong').expect(200);
      await request(server).get('/api/v1/health').set('x-client-key', 'wrong').expect(200);
      await request(server).get('/api/v1/health').set('x-client-key', 'wrong').expect(429);
      await request(server).get('/api/v1/health').set('x-client-key', 'web-app-trusted-key').expect(200);
    } finally {
      await t.close();
    }
  });

  it('rate limits per client with a 429 envelope', async () => {
    const t = await createTestApp({ rateLimit: { ttlMs: 60_000, limit: 3 } });
    try {
      const server = t.app.getHttpServer();
      for (let i = 0; i < 3; i++) await request(server).get('/api/v1/health').expect(200);
      const res = await request(server).get('/api/v1/health').expect(429);
      expect(res.body.error.code).toBe('RATE_LIMITED');
      expect(res.headers['retry-after']).toBeDefined();
    } finally {
      await t.close();
    }
  });
});
