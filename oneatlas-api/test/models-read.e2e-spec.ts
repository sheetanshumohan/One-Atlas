import request from 'supertest';
import { createTestApp, TestApp } from './helpers/app';
import { seedFixtures } from './helpers/fixtures';

const slugs = (res: request.Response): string[] => res.body.data.map((m: { slug: string }) => m.slug);

describe('Models — discovery, search, filter, sort, pagination (e2e)', () => {
  let t: TestApp;
  const get = (url: string) => request(t.app.getHttpServer()).get(`/api/v1${url}`);

  beforeAll(async () => {
    t = await createTestApp();
    await seedFixtures(t.prisma);
  });
  afterAll(() => t.close());

  describe('GET /models', () => {
    it('lists models newest first with unknown release dates last (default sort)', async () => {
      const res = await get('/models').expect(200);
      expect(slugs(res)).toEqual(['alpha-2', 'alpha-1', 'beta-1', 'beta-old', 'beta-code']);
      expect(res.body.meta).toEqual({ page: 1, pageSize: 20, total: 5, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
    });

    it('returns the summary shape with normalised pricing', async () => {
      const res = await get('/models?q=alpha-1').expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toEqual({
        id: expect.any(String),
        slug: 'alpha-1',
        name: 'Alpha 1',
        type: 'CHAT',
        status: 'ACTIVE',
        organization: { slug: 'alpha-lab', name: 'Alpha Lab' },
        releaseDate: '2024-01-10',
        contextWindow: 128000,
        maxOutputTokens: 4096,
        openWeights: false,
        inputModalities: ['TEXT'],
        outputModalities: ['TEXT'],
        capabilities: ['json-mode', 'tool-calling'],
        // cheapest input (cloud-b 0.5) and cheapest output (cloud-a 2) come from different providers
        pricing: { minInputPricePerMTok: 0.5, minOutputPricePerMTok: 2, providerCount: 2, currency: 'USD', unit: 'per_1m_tokens' },
      });
    });

    describe('sorting', () => {
      it.each([
        ['inputPrice', ['beta-1', 'alpha-1', 'beta-old', 'alpha-2', 'beta-code']],
        ['inputPrice&order=desc', ['alpha-2', 'beta-old', 'alpha-1', 'beta-1', 'beta-code']],
        ['outputPrice', ['beta-1', 'alpha-1', 'beta-old', 'alpha-2', 'beta-code']],
        ['contextWindow', ['alpha-2', 'alpha-1', 'beta-1', 'beta-old', 'beta-code']],
        ['contextWindow&order=asc', ['beta-old', 'beta-1', 'alpha-1', 'alpha-2', 'beta-code']],
        ['releaseDate&order=asc', ['beta-old', 'beta-1', 'alpha-1', 'alpha-2', 'beta-code']],
        ['name', ['alpha-1', 'alpha-2', 'beta-1', 'beta-code', 'beta-old']],
        ['name&order=desc', ['beta-old', 'beta-code', 'beta-1', 'alpha-2', 'alpha-1']],
        ['providerCount', ['alpha-1', 'alpha-2', 'beta-1', 'beta-old', 'beta-code']],
      ])('sort=%s', async (qs, expected) => {
        expect(slugs(await get(`/models?sort=${qs}`).expect(200))).toEqual(expected);
      });
    });

    describe('filtering', () => {
      it.each([
        ['organization=beta-corp', ['beta-1', 'beta-old', 'beta-code']],
        ['organization=alpha-lab,beta-corp', ['alpha-2', 'alpha-1', 'beta-1', 'beta-old', 'beta-code']],
        ['organization=alpha-lab&organization=gamma-labs', ['alpha-2', 'alpha-1']],
        ['organization=unknown-org', []],
        // beta-1 is listed on cloud-a but the offering is unavailable → excluded
        ['provider=cloud-a', ['alpha-2', 'alpha-1']],
        ['provider=cloud-b', ['alpha-1', 'beta-1', 'beta-old']],
        ['provider=cloud-c', []],
        ['capability=tool-calling', ['alpha-2', 'alpha-1']],
        ['capability=tool-calling,vision', ['alpha-2']],
        ['capability=json-mode,vision', []],
        ['type=CHAT', ['alpha-1', 'beta-1', 'beta-old']],
        ['type=chat,code', ['alpha-1', 'beta-1', 'beta-old', 'beta-code']],
        ['status=DEPRECATED', ['beta-old']],
        ['status=preview,deprecated', ['beta-old', 'beta-code']],
        ['inputModality=IMAGE', ['alpha-2']],
        ['inputModality=TEXT,IMAGE', ['alpha-2']],
        ['outputModality=TEXT', ['alpha-2', 'alpha-1', 'beta-1', 'beta-old', 'beta-code']],
        ['openWeights=true', ['beta-1', 'beta-code']],
        ['openWeights=false', ['alpha-2', 'alpha-1', 'beta-old']],
        ['openWeights=0', ['alpha-2', 'alpha-1', 'beta-old']],
        ['minContext=100000', ['alpha-2', 'alpha-1']],
        ['maxContext=50000', ['beta-1', 'beta-old']],
        ['minContext=32000&maxContext=128000', ['alpha-1', 'beta-1']],
        ['maxInputPrice=1', ['alpha-1', 'beta-1']],
        ['maxInputPrice=0.2', ['beta-1']],
        ['maxOutputPrice=2', ['alpha-1', 'beta-1']],
        ['releasedAfter=2024-01-01', ['alpha-2', 'alpha-1']],
        ['releasedBefore=2023-12-31', ['beta-1', 'beta-old']],
        ['releasedAfter=2024-01-10&releasedBefore=2024-01-10', ['alpha-1']],
        // combined filters are AND-ed
        ['organization=alpha-lab&capability=tool-calling&maxInputPrice=1', ['alpha-1']],
        ['openWeights=true&type=CODE', ['beta-code']],
      ])('%s', async (qs, expected) => {
        const res = await get(`/models?${qs}`).expect(200);
        expect(slugs(res)).toEqual(expected);
        expect(res.body.meta.total).toBe(expected.length);
      });
    });

    describe('text search (q)', () => {
      it.each([
        ['coder', ['beta-code']],
        ['ALPHA', ['alpha-2', 'alpha-1']],
        ['general purpose', ['alpha-1']], // description
        ['beta corp', ['beta-1', 'beta-old', 'beta-code']], // organization name
        ['  alpha 2  ', ['alpha-2']], // trimmed
        ['nothing-matches', []],
        ['%', []], // LIKE wildcards are escaped, not interpreted
        ['_', []],
        ['\\', []],
      ])('q=%j', async (q, expected) => {
        expect(slugs(await get(`/models?q=${encodeURIComponent(q)}`).expect(200))).toEqual(expected);
      });
    });

    describe('pagination', () => {
      it('pages are disjoint, stable and cover the full result set', async () => {
        const p1 = await get('/models?pageSize=2&page=1').expect(200);
        const p2 = await get('/models?pageSize=2&page=2').expect(200);
        const p3 = await get('/models?pageSize=2&page=3').expect(200);
        expect(p1.body.meta).toMatchObject({ total: 5, totalPages: 3, hasNextPage: true, hasPreviousPage: false });
        expect(p3.body.meta).toMatchObject({ hasNextPage: false, hasPreviousPage: true });
        const all = [...slugs(p1), ...slugs(p2), ...slugs(p3)];
        expect(all).toEqual(['alpha-2', 'alpha-1', 'beta-1', 'beta-old', 'beta-code']);
        expect(new Set(all).size).toBe(5);
      });

      it('ties are broken deterministically (same order on every call)', async () => {
        // providerCount has ties (1,1,1) — order must be stable by name then slug.
        const a = slugs(await get('/models?sort=providerCount&pageSize=100'));
        const b = slugs(await get('/models?sort=providerCount&pageSize=100'));
        expect(a).toEqual(b);
      });

      it('a page past the end returns empty data with correct totals', async () => {
        const res = await get('/models?page=99&pageSize=2').expect(200);
        expect(res.body.data).toEqual([]);
        expect(res.body.meta).toMatchObject({ total: 5, totalPages: 3, hasNextPage: false });
      });
    });

    describe('validation', () => {
      it.each([
        ['page=0', 'page'],
        ['page=-1', 'page'],
        ['page=1.5', 'page'],
        ['page=abc', 'page'],
        ['pageSize=0', 'pageSize'],
        ['pageSize=101', 'pageSize'],
        ['pageSize=', 'pageSize'],
        ['sort=price', 'sort'],
        ['order=up', 'order'],
        ['type=BANANA', 'type'],
        ['status=LIVE', 'status'],
        ['inputModality=SMELL', 'inputModality'],
        ['openWeights=yes', 'openWeights'],
        ['minContext=0', 'minContext'],
        ['minContext=abc', 'minContext'],
        ['maxInputPrice=-1', 'maxInputPrice'],
        ['maxInputPrice=Infinity', 'maxInputPrice'],
        ['releasedAfter=2024-13-01', 'releasedAfter'],
        ['releasedAfter=yesterday', 'releasedAfter'],
        ['organization=Bad%20Slug!', 'organization'],
        ['minContext=10&maxContext=5', 'minContext'],
        ['releasedAfter=2025-01-01&releasedBefore=2024-01-01', 'releasedAfter'],
        [`q=${'x'.repeat(101)}`, 'q'],
        ['unknownParam=1', 'unknownParam'],
      ])('%s -> 400 on field %s', async (qs, field) => {
        const res = await get(`/models?${qs}`).expect(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
        expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
      });
    });
  });

  describe('GET /models/:slug', () => {
    it('returns full detail: specs, per-provider pricing (cheapest first), capabilities and benchmarks', async () => {
      const res = await get('/models/alpha-1').expect(200);
      const m = res.body;
      expect(m).toMatchObject({
        slug: 'alpha-1',
        description: 'General purpose chat',
        organization: { slug: 'alpha-lab', name: 'Alpha Lab', type: 'AI_LAB' },
        parameterCountB: null,
        knowledgeCutoff: null,
        pricing: { minInputPricePerMTok: 0.5, minOutputPricePerMTok: 2, providerCount: 2 },
      });
      expect(m.capabilities.map((c: { slug: string }) => c.slug)).toEqual(['json-mode', 'tool-calling']);
      expect(m.providers.map((p: { provider: { slug: string } }) => p.provider.slug)).toEqual(['cloud-b', 'cloud-a']);
      expect(m.providers[0]).toMatchObject({ providerModelId: 'b/alpha-1', inputPricePerMTok: 0.5, outputPricePerMTok: 3, isAvailable: true });

      const byBench = Object.fromEntries(m.benchmarks.map((b: { benchmark: { slug: string } }) => [b.benchmark.slug, b]));
      expect(Object.keys(byBench).sort()).toEqual(['code-1', 'elo-1', 'err-1', 'know-1']);
      expect(byBench['elo-1']).toMatchObject({ score: 1200, normalizedScore: 50, benchmark: { unit: 'elo', minScore: 800, maxScore: 1600 } });
      expect(byBench['err-1']).toMatchObject({ score: 10, normalizedScore: 90, benchmark: { higherIsBetter: false } });
    });

    it('lists unavailable offerings but excludes them from the price summary', async () => {
      const res = await get('/models/beta-1').expect(200);
      expect(res.body.providers.map((p: { provider: { slug: string }; isAvailable: boolean }) => [p.provider.slug, p.isAvailable])).toEqual([
        ['cloud-a', false],
        ['cloud-b', true],
      ]);
      expect(res.body.pricing).toMatchObject({ minInputPricePerMTok: 0.2, providerCount: 1 });
    });

    it('models without offerings have null prices', async () => {
      const res = await get('/models/beta-code').expect(200);
      expect(res.body.pricing).toMatchObject({ minInputPricePerMTok: null, minOutputPricePerMTok: null, providerCount: 0 });
      expect(res.body.providers).toEqual([]);
      expect(res.body.releaseDate).toBeNull();
    });

    it('404 with error envelope for unknown slugs', async () => {
      const res = await get('/models/does-not-exist').expect(404);
      expect(res.body).toMatchObject({ statusCode: 404, error: { code: 'NOT_FOUND', message: "Model 'does-not-exist' not found" }, path: '/api/v1/models/does-not-exist' });
    });

    it('GET /models/:slug/providers lists offerings cheapest first', async () => {
      const res = await get('/models/alpha-1/providers').expect(200);
      expect(res.body.data.map((o: { inputPricePerMTok: number }) => o.inputPricePerMTok)).toEqual([0.5, 1]);
      await get('/models/nope/providers').expect(404);
    });
  });

  describe('GET /models/compare', () => {
    it('compares models side by side in the requested order', async () => {
      const res = await get('/models/compare?models=alpha-2,alpha-1').expect(200);
      const c = res.body;
      expect(c.models).toEqual(['alpha-2', 'alpha-1']);
      expect(c.items.map((m: { slug: string }) => m.slug)).toEqual(['alpha-2', 'alpha-1']);
      expect(c.highlights).toEqual({
        cheapestInput: ['alpha-1'],
        cheapestOutput: ['alpha-1'],
        largestContext: ['alpha-2'],
        largestMaxOutput: ['alpha-2', 'alpha-1'], // tie: both 4096
        mostProviders: ['alpha-1'],
        newest: ['alpha-2'],
      });
      const bench = Object.fromEntries(c.benchmarks.map((b: { benchmark: { slug: string } }) => [b.benchmark.slug, b]));
      expect(bench['know-1']).toMatchObject({ scores: { 'alpha-2': 90, 'alpha-1': 80 }, best: ['alpha-2'] });
      expect(bench['code-2']).toMatchObject({ scores: { 'alpha-2': 75, 'alpha-1': null }, best: ['alpha-2'] });
      // lower-is-better benchmark: best is decided on normalised score
      expect(bench['err-1']).toMatchObject({ scores: { 'alpha-2': null, 'alpha-1': 10 }, normalizedScores: { 'alpha-1': 90 }, best: ['alpha-1'] });
      const caps = Object.fromEntries(c.capabilities.map((x: { capability: { slug: string }; support: unknown }) => [x.capability.slug, x.support]));
      expect(caps).toEqual({
        'json-mode': { 'alpha-2': false, 'alpha-1': true },
        reasoning: { 'alpha-2': true, 'alpha-1': false },
        'tool-calling': { 'alpha-2': true, 'alpha-1': true },
        vision: { 'alpha-2': true, 'alpha-1': false },
      });
    });

    it('supports up to 6 models and repeated query params', async () => {
      const res = await get('/models/compare?models=alpha-1&models=alpha-2,beta-1,beta-code,beta-old').expect(200);
      expect(res.body.models).toHaveLength(5);
    });

    it('handles models with no prices / no benchmarks', async () => {
      const res = await get('/models/compare?models=beta-code,beta-old').expect(200);
      expect(res.body.highlights.cheapestInput).toEqual(['beta-old']);
      expect(res.body.highlights.newest).toEqual(['beta-old']);
    });

    it('404 names every missing slug', async () => {
      const res = await get('/models/compare?models=alpha-1,ghost-1,ghost-2').expect(404);
      expect(res.body.error.message).toContain('ghost-1');
      expect(res.body.error.message).toContain('ghost-2');
    });

    it.each([
      ['', 'missing param'],
      ['?models=alpha-1', 'single model'],
      ['?models=alpha-1,alpha-1', 'duplicates collapse to one'],
      ['?models=a,b,c,d,e,f,g', 'more than 6'],
      ['?models=Alpha_1,alpha-2', 'invalid slug'],
    ])('400 for %s (%s)', async (qs) => {
      const res = await get(`/models/compare${qs}`).expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
