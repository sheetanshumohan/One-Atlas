import request from 'supertest';
import { auth, createTestApp, TestApp } from './helpers/app';
import { seedFixtures } from './helpers/fixtures';

const slugs = (res: request.Response): string[] => res.body.data.map((m: { slug: string }) => m.slug);

describe('AI labs, providers, capabilities & benchmarks directories (e2e)', () => {
  let t: TestApp;
  const http = () => request(t.app.getHttpServer());

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(() => seedFixtures(t.prisma));
  afterAll(() => t.close());

  describe('Organizations', () => {
    it('lists organizations alphabetically with model counts', async () => {
      const res = await http().get('/api/v1/organizations').expect(200);
      expect(res.body.data.map((o: { slug: string; modelCount: number }) => [o.slug, o.modelCount])).toEqual([
        ['alpha-lab', 2], ['beta-corp', 3], ['gamma-labs', 0],
      ]);
      expect(res.body.meta.total).toBe(3);
    });

    it.each([
      ['sort=modelCount', ['beta-corp', 'alpha-lab', 'gamma-labs']],
      ['sort=modelCount&order=asc', ['gamma-labs', 'alpha-lab', 'beta-corp']],
      ['sort=foundedYear', ['alpha-lab', 'beta-corp', 'gamma-labs']], // null founded year last
      ['sort=name&order=desc', ['gamma-labs', 'beta-corp', 'alpha-lab']],
      ['type=BIG_TECH', ['beta-corp']],
      ['type=ai_lab,startup', ['alpha-lab', 'gamma-labs']],
      ['country=fr', ['beta-corp']],
      ['q=labs', ['gamma-labs']],
      ['q=first', ['alpha-lab']], // description
      ['pageSize=1&page=2', ['beta-corp']],
    ])('%s', async (qs, expected) => {
      expect(slugs(await http().get(`/api/v1/organizations?${qs}`).expect(200))).toEqual(expected);
    });

    it.each(['type=GOVERNMENT', 'country=FRA', 'sort=size', 'pageSize=500'])('400 for %s', async (qs) => {
      await http().get(`/api/v1/organizations?${qs}`).expect(400);
    });

    it('detail shows the release timeline (newest first, undated last) and stats', async () => {
      const res = await http().get('/api/v1/organizations/beta-corp').expect(200);
      expect(res.body).toMatchObject({
        slug: 'beta-corp', name: 'Beta Corp', type: 'BIG_TECH', country: 'FR', modelCount: 3,
        stats: { modelCount: 3, openWeightsModelCount: 2, firstRelease: '2022-01-01', latestRelease: '2023-06-15' },
      });
      expect(res.body.models.map((m: { slug: string }) => m.slug)).toEqual(['beta-1', 'beta-old', 'beta-code']);
      const empty = await http().get('/api/v1/organizations/gamma-labs').expect(200);
      expect(empty.body.stats).toEqual({ modelCount: 0, openWeightsModelCount: 0, firstRelease: null, latestRelease: null });
      await http().get('/api/v1/organizations/ghost').expect(404);
    });

    it('create / update / delete lifecycle with validation and conflicts', async () => {
      const created = await http()
        .post('/api/v1/organizations')
        .set(auth)
        .send({ name: 'Delta AI', type: 'STARTUP', country: 'de', foundedYear: 2024, website: 'https://delta.example.com' })
        .expect(201);
      expect(created.body).toMatchObject({ slug: 'delta-ai', country: 'DE', modelCount: 0 });

      await http().post('/api/v1/organizations').set(auth).send({ name: 'Delta AI', type: 'STARTUP' }).expect(409);
      for (const bad of [{ type: 'X' }, { country: 'DEU' }, { foundedYear: 1800 }, { website: 'ftp://x.com' }, { website: 'not-a-url' }, { name: '' }]) {
        await http().post('/api/v1/organizations').set(auth).send({ name: 'Epsilon', type: 'STARTUP', ...bad }).expect(400);
      }

      const patched = await http().patch('/api/v1/organizations/delta-ai').set(auth).send({ description: 'German lab', type: 'AI_LAB' }).expect(200);
      expect(patched.body).toMatchObject({ description: 'German lab', type: 'AI_LAB', country: 'DE' });
      await http().patch('/api/v1/organizations/delta-ai').set(auth).send({ name: null }).expect(400);
      await http().patch('/api/v1/organizations/ghost').set(auth).send({ description: 'x' }).expect(404);
      await http().patch('/api/v1/organizations/delta-ai').set(auth).send({ slug: 'alpha-lab' }).expect(409);

      await http().delete('/api/v1/organizations/delta-ai').set(auth).expect(204);
      await http().delete('/api/v1/organizations/delta-ai').set(auth).expect(404);
    });

    it('refuses to delete an organization that still owns models (409)', async () => {
      const res = await http().delete('/api/v1/organizations/alpha-lab').set(auth).expect(409);
      expect(res.body.error.message).toContain('2 model(s)');
      await http().get('/api/v1/models/alpha-1').expect(200);
    });
  });

  describe('Providers', () => {
    it('lists providers with counts of AVAILABLE offerings', async () => {
      const res = await http().get('/api/v1/providers').expect(200);
      expect(res.body.data.map((p: { slug: string; modelCount: number }) => [p.slug, p.modelCount])).toEqual([
        ['cloud-a', 2], // beta-1 offering on cloud-a is unavailable
        ['cloud-b', 3],
        ['cloud-c', 0],
      ]);
    });

    it.each([
      ['model=alpha-1', ['cloud-a', 'cloud-b']],
      ['model=beta-1', ['cloud-b']],
      ['model=beta-code', []],
      ['q=cloud%20b', ['cloud-b']],
      ['sort=modelCount', ['cloud-a', 'cloud-b', 'cloud-c']], // total offerings: a=3, b=3, c=0 → tie broken by slug
      ['sort=name&order=desc', ['cloud-c', 'cloud-b', 'cloud-a']],
    ])('%s', async (qs, expected) => {
      expect(slugs(await http().get(`/api/v1/providers?${qs}`).expect(200))).toEqual(expected);
    });

    it('detail lists every served model with provider-specific pricing', async () => {
      const res = await http().get('/api/v1/providers/cloud-b').expect(200);
      expect(res.body).toMatchObject({ slug: 'cloud-b', modelCount: 3, stats: { modelCount: 3, organizations: ['alpha-lab', 'beta-corp'] } });
      expect(res.body.models.map((m: { model: { slug: string }; inputPricePerMTok: number }) => [m.model.slug, m.inputPricePerMTok])).toEqual([
        ['alpha-1', 0.5], ['beta-1', 0.2], ['beta-old', 5],
      ]);
      await http().get('/api/v1/providers/ghost').expect(404);
    });

    it('create / update / delete with validation', async () => {
      const res = await http().post('/api/v1/providers').set(auth).send({ name: 'Edge Infer', apiBaseUrl: 'https://api.edge.example.com/v1' }).expect(201);
      expect(res.body).toMatchObject({ slug: 'edge-infer', modelCount: 0 });
      await http().post('/api/v1/providers').set(auth).send({ name: 'Edge Infer' }).expect(409);
      await http().post('/api/v1/providers').set(auth).send({ name: 'X', apiBaseUrl: 'javascript:alert(1)' }).expect(400);
      await http().patch('/api/v1/providers/edge-infer').set(auth).send({ description: 'Edge' }).expect(200);
      await http().patch('/api/v1/providers/edge-infer').set(auth).send({ name: null }).expect(400);
      await http().patch('/api/v1/providers/ghost').set(auth).send({ description: 'x' }).expect(404);
      await http().delete('/api/v1/providers/edge-infer').set(auth).expect(204);
      await http().delete('/api/v1/providers/edge-infer').set(auth).expect(404);
    });
  });

  describe('Capabilities', () => {
    it('lists the catalogue with model counts', async () => {
      const res = await http().get('/api/v1/capabilities').expect(200);
      expect(res.body.data.map((c: { slug: string; modelCount: number }) => [c.slug, c.modelCount])).toEqual([
        ['json-mode', 2], ['reasoning', 1], ['tool-calling', 2], ['vision', 1],
      ]);
    });
    it('creates capabilities (admin) and rejects duplicates', async () => {
      await http().post('/api/v1/capabilities').set(auth).send({ name: 'Fine tuning' }).expect(201).expect((r) => expect(r.body.slug).toBe('fine-tuning'));
      await http().post('/api/v1/capabilities').set(auth).send({ name: 'Fine tuning' }).expect(409);
      await http().post('/api/v1/capabilities').send({ name: 'Nope' }).expect(401);
    });
  });

  describe('Benchmarks', () => {
    it('lists benchmarks grouped by category with result counts', async () => {
      const res = await http().get('/api/v1/benchmarks').expect(200);
      // ordered by category (enum order: GENERAL_KNOWLEDGE, REASONING, ..., CODING) then name
      expect(res.body.data.map((b: { slug: string; category: string; resultCount: number }) => [b.slug, b.category, b.resultCount])).toEqual([
        ['elo-1', 'GENERAL_KNOWLEDGE', 2],
        ['know-1', 'GENERAL_KNOWLEDGE', 4],
        ['err-1', 'REASONING', 2],
        ['code-1', 'CODING', 3],
        ['code-2', 'CODING', 2],
      ]);
    });

    it('filters by category (case-insensitive) and rejects unknown categories', async () => {
      expect(slugs(await http().get('/api/v1/benchmarks?category=coding').expect(200))).toEqual(['code-1', 'code-2']);
      await http().get('/api/v1/benchmarks?category=SPORTS').expect(400);
    });

    it('detail includes a ranked leaderboard', async () => {
      const res = await http().get('/api/v1/benchmarks/err-1').expect(200);
      expect(res.body).toMatchObject({ slug: 'err-1', higherIsBetter: false, minScore: 0, maxScore: 100, resultCount: 2 });
      expect(res.body.leaderboard.map((e: { rank: number; model: { slug: string } }) => [e.rank, e.model.slug])).toEqual([[1, 'alpha-1'], [2, 'beta-1']]);
      await http().get('/api/v1/benchmarks/ghost').expect(404);
    });

    it('create / update / delete with scale validation', async () => {
      await http().post('/api/v1/benchmarks').set(auth).send({ name: 'Latency Score', category: 'AGENTIC', minScore: 10, maxScore: 5 }).expect(400);
      const res = await http().post('/api/v1/benchmarks').set(auth).send({ name: 'Arena Hard', category: 'general_knowledge'.toUpperCase() }).expect(201);
      expect(res.body).toMatchObject({ slug: 'arena-hard', minScore: 0, maxScore: 100, higherIsBetter: true, unit: '%' });
      await http().post('/api/v1/benchmarks').set(auth).send({ name: 'Arena Hard', category: 'MATH' }).expect(409);
      await http().patch('/api/v1/benchmarks/arena-hard').set(auth).send({ maxScore: 10 }).expect(200);
      await http().patch('/api/v1/benchmarks/arena-hard').set(auth).send({ minScore: 20 }).expect(400); // 20 > max 10
      await http().patch('/api/v1/benchmarks/arena-hard').set(auth).send({ unit: null }).expect(400);
      await http().delete('/api/v1/benchmarks/arena-hard').set(auth).expect(204);
      await http().delete('/api/v1/benchmarks/arena-hard').set(auth).expect(404);
    });

    it('refuses a scale change that would orphan existing results', async () => {
      const res = await http().patch('/api/v1/benchmarks/know-1').set(auth).send({ maxScore: 75 }).expect(400);
      expect(res.body.error.details[0].messages[0]).toMatch(/2 existing result\(s\)/); // 80 and 90
      await http().patch('/api/v1/benchmarks/know-1').set(auth).send({ maxScore: 90 }).expect(200);
    });

    it('deleting a benchmark cascades its results', async () => {
      await http().delete('/api/v1/benchmarks/know-1').set(auth).expect(204);
      const m = await http().get('/api/v1/models/alpha-1');
      expect(m.body.benchmarks.map((b: { benchmark: { slug: string } }) => b.benchmark.slug)).not.toContain('know-1');
    });
  });
});
