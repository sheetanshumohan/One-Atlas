import request from 'supertest';
import { createTestApp, TestApp } from './helpers/app';
import { seedFixtures } from './helpers/fixtures';

type Entry = { rank: number; model: { slug: string }; score: number; benchmarksCovered: number };
const board = (res: request.Response) => res.body.data.map((e: Entry) => [e.rank, e.model.slug, e.score]);

describe('Rankings, leaderboards, global search, stats & health (e2e)', () => {
  let t: TestApp;
  const get = (url: string) => request(t.app.getHttpServer()).get(`/api/v1${url}`);

  beforeAll(async () => {
    t = await createTestApp();
    await seedFixtures(t.prisma);
  });
  afterAll(() => t.close());

  describe('GET /rankings', () => {
    it('single benchmark: ranked by score with shared ranks for ties', async () => {
      const res = await get('/rankings?benchmark=know-1').expect(200);
      expect(res.body.scope).toMatchObject({ kind: 'benchmark', benchmark: 'know-1', category: null });
      expect(board(res)).toEqual([
        [1, 'alpha-2', 90],
        [2, 'alpha-1', 80],
        [3, 'beta-1', 70], // tie → same rank, ordered by name
        [3, 'beta-old', 70],
      ]);
      expect(res.body.data[0]).toMatchObject({ model: { organization: { slug: 'alpha-lab' }, type: 'REASONING', openWeights: false } });
    });

    it('lower-is-better benchmarks rank the smallest raw score first', async () => {
      const res = await get('/rankings?benchmark=err-1').expect(200);
      expect(board(res)).toEqual([[1, 'alpha-1', 90], [2, 'beta-1', 70]]);
      expect(res.body.data[0].results['err-1']).toEqual({ score: 10, normalizedScore: 90 });
    });

    it('non-percentage scales are normalised (Elo 800–1600)', async () => {
      const res = await get('/rankings?benchmark=elo-1').expect(200);
      expect(board(res)).toEqual([[1, 'alpha-2', 75], [2, 'alpha-1', 50]]);
    });

    it('category aggregate: mean normalised score, ties share a rank', async () => {
      const res = await get('/rankings?category=coding').expect(200);
      expect(res.body.scope).toMatchObject({ kind: 'category', category: 'CODING' });
      expect(res.body.scope.benchmarks.map((b: { slug: string }) => b.slug)).toEqual(['code-1', 'code-2']);
      expect(board(res)).toEqual([
        [1, 'alpha-2', 80], // (85+75)/2
        [1, 'beta-code', 80], // (95+65)/2
        [3, 'alpha-1', 60],
      ]);
    });

    it('minBenchmarks excludes thinly-evaluated models from aggregates', async () => {
      const res = await get('/rankings?category=CODING&minBenchmarks=2').expect(200);
      expect(board(res)).toEqual([[1, 'alpha-2', 80], [1, 'beta-code', 80]]);
      expect(res.body.meta.total).toBe(2);
    });

    it('overall board across every benchmark (coverage breaks score ties)', async () => {
      const res = await get('/rankings').expect(200);
      expect(res.body.scope.kind).toBe('overall');
      expect(res.body.data.map((e: Entry) => [e.rank, e.model.slug, e.score, e.benchmarksCovered])).toEqual([
        [1, 'alpha-2', 81.25, 4], // (90+85+75+75)/4
        [2, 'beta-code', 80, 2],
        [3, 'alpha-1', 70, 4], // (80+60+50+90)/4
        [3, 'beta-1', 70, 2], // (70+70)/2
        [3, 'beta-old', 70, 1],
      ]);
    });

    it('filters by model type, organization and open weights', async () => {
      expect(board(await get('/rankings?benchmark=know-1&type=CHAT'))).toEqual([[1, 'alpha-1', 80], [2, 'beta-1', 70], [2, 'beta-old', 70]]);
      expect(board(await get('/rankings?benchmark=know-1&organization=beta-corp'))).toEqual([[1, 'beta-1', 70], [1, 'beta-old', 70]]);
      expect(board(await get('/rankings?category=CODING&openWeights=true'))).toEqual([[1, 'beta-code', 80]]);
    });

    it('paginates the leaderboard while keeping global ranks', async () => {
      const res = await get('/rankings?benchmark=know-1&pageSize=2&page=2').expect(200);
      expect(board(res)).toEqual([[3, 'beta-1', 70], [3, 'beta-old', 70]]);
      expect(res.body.meta).toMatchObject({ total: 4, totalPages: 2, hasPreviousPage: true, hasNextPage: false });
    });

    it('empty category returns an empty board', async () => {
      const res = await get('/rankings?category=MULTIMODAL').expect(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.scope.benchmarks).toEqual([]);
    });

    it.each([
      ['benchmark=know-1&category=CODING', 400],
      ['category=SPORTS', 400],
      ['minBenchmarks=0', 400],
      ['benchmark=Bad_Slug', 400],
      ['benchmark=ghost', 404],
    ])('%s -> %i', async (qs, status) => {
      await get(`/rankings?${qs}`).expect(status);
    });
  });

  describe('GET /search (global search)', () => {
    it('searches every entity type at once', async () => {
      const res = await get('/search?q=alpha').expect(200);
      expect(res.body.models.map((m: { slug: string }) => m.slug)).toEqual(['alpha-1', 'alpha-2']);
      expect(res.body.organizations).toEqual([{ slug: 'alpha-lab', name: 'Alpha Lab', type: 'AI_LAB' }]);
      expect(res.body.providers).toEqual([]);
      expect(res.body.total).toBe(3);
    });

    it('ranks exact > prefix > word-prefix > substring matches', async () => {
      const res = await get('/search?q=beta%201').expect(200);
      expect(res.body.models[0].slug).toBe('beta-1');
      const code = await get('/search?q=code').expect(200);
      expect(code.body.models.map((m: { slug: string }) => m.slug)).toEqual(['beta-code']);
      expect(code.body.benchmarks.map((b: { slug: string }) => b.slug)).toEqual(['code-1', 'code-2']);
    });

    it('finds providers and benchmarks', async () => {
      const res = await get('/search?q=cloud').expect(200);
      expect(res.body.providers.map((p: { slug: string }) => p.slug)).toEqual(['cloud-a', 'cloud-b', 'cloud-c']);
    });

    it('respects the per-type limit', async () => {
      const res = await get('/search?q=a&limit=1').expect(200);
      for (const key of ['models', 'organizations', 'providers', 'benchmarks']) expect(res.body[key].length).toBeLessThanOrEqual(1);
    });

    it('wildcards are literal', async () => {
      expect((await get('/search?q=%25').expect(200)).body.total).toBe(0);
    });

    it.each(['', '?q=', '?q=%20%20', '?q=a&limit=0', '?q=a&limit=21', `?q=${'x'.repeat(101)}`])('400 for "%s"', async (qs) => {
      await get(`/search${qs}`).expect(400);
    });
  });

  describe('GET /stats and /health', () => {
    it('stats returns catalogue totals', async () => {
      const res = await get('/stats').expect(200);
      expect(res.body).toEqual({
        totals: { models: 5, organizations: 3, providers: 3, benchmarks: 5, offerings: 5, benchmarkResults: 13, openWeightsModels: 2 },
        modelsByType: { CHAT: 3, REASONING: 1, CODE: 1 },
      });
    });

    it('health reports database connectivity and is never cached', async () => {
      const res = await get('/health').expect(200);
      expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
      expect(res.headers['cache-control']).toBe('no-store');
    });
  });
});
