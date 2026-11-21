import request from 'supertest';
import { auth, createTestApp, TestApp } from './helpers/app';
import { pricingInconsistencies, seedFixtures } from './helpers/fixtures';

const newModel = (over: Record<string, unknown> = {}) => ({
  name: 'New Model 2.0',
  organization: 'gamma-labs',
  type: 'CHAT',
  inputModalities: ['TEXT', 'IMAGE'],
  outputModalities: ['TEXT'],
  contextWindow: 64000,
  maxOutputTokens: 8000,
  capabilities: ['vision', 'tool-calling'],
  releaseDate: '2025-06-01',
  parameterCountB: 12.5,
  openWeights: true,
  license: 'Apache 2.0',
  ...over,
});

describe('Models — write API, pricing & benchmark data management (e2e)', () => {
  let t: TestApp;
  const http = () => request(t.app.getHttpServer());

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(() => seedFixtures(t.prisma));
  afterEach(async () => {
    // Data-consistency invariant must hold after EVERY test in this suite.
    expect(await pricingInconsistencies(t.prisma)).toEqual([]);
  });
  afterAll(() => t.close());

  describe('POST /models', () => {
    it('creates a model, derives the slug and returns the detail view', async () => {
      const res = await http().post('/api/v1/models').set(auth).send(newModel()).expect(201);
      expect(res.body).toMatchObject({
        slug: 'new-model-2.0',
        name: 'New Model 2.0',
        organization: { slug: 'gamma-labs' },
        status: 'ACTIVE',
        releaseDate: '2025-06-01',
        parameterCountB: 12.5,
        pricing: { minInputPricePerMTok: null, providerCount: 0 },
        providers: [],
        benchmarks: [],
      });
      expect(res.body.capabilities.map((c: { slug: string }) => c.slug)).toEqual(['tool-calling', 'vision']);
      await http().get('/api/v1/models/new-model-2.0').expect(200);
      const org = await http().get('/api/v1/organizations/gamma-labs').expect(200);
      expect(org.body.modelCount).toBe(1);
    });

    it('accepts an explicit slug and minimal body', async () => {
      const res = await http()
        .post('/api/v1/models')
        .set(auth)
        .send({ slug: 'mini', name: 'Mini', organization: 'alpha-lab', type: 'EMBEDDING', inputModalities: ['TEXT'], outputModalities: ['EMBEDDING'] })
        .expect(201);
      expect(res.body).toMatchObject({ slug: 'mini', openWeights: false, contextWindow: null, capabilities: [] });
    });

    it('409 on duplicate slug', async () => {
      const res = await http().post('/api/v1/models').set(auth).send(newModel({ slug: 'alpha-1' })).expect(409);
      expect(res.body.error).toMatchObject({ code: 'CONFLICT', details: { fields: ['slug'] } });
    });

    it.each([
      [{ organization: 'nope' }, 'organization'],
      [{ capabilities: ['vision', 'telepathy'] }, 'capabilities'],
      [{ maxOutputTokens: 100000 }, 'maxOutputTokens'], // > contextWindow
      [{ name: '' }, 'name'],
      [{ name: '   ' }, 'name'],
      [{ name: '!!!' }, 'slug'], // cannot derive a slug
      [{ slug: 'Bad Slug' }, 'slug'],
      [{ type: 'ROBOT' }, 'type'],
      [{ status: 'LIVE' }, 'status'],
      [{ inputModalities: [] }, 'inputModalities'],
      [{ inputModalities: ['TEXT', 'TEXT'] }, 'inputModalities'],
      [{ outputModalities: ['SMELL'] }, 'outputModalities'],
      [{ contextWindow: 0 }, 'contextWindow'],
      [{ contextWindow: 1.5 }, 'contextWindow'],
      [{ contextWindow: '64000' }, 'contextWindow'], // strings are not silently coerced in bodies
      [{ parameterCountB: -1 }, 'parameterCountB'],
      [{ openWeights: 'true' }, 'openWeights'],
      [{ releaseDate: '01/06/2025' }, 'releaseDate'],
      [{ capabilities: 'vision' }, 'capabilities'],
      [{ isFeatured: true }, 'isFeatured'], // unknown fields rejected
    ])('400 for %j (field %s)', async (over, field) => {
      const res = await http().post('/api/v1/models').set(auth).send(newModel(over)).expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
    });

    it('400 when required fields are missing', async () => {
      const res = await http().post('/api/v1/models').set(auth).send({}).expect(400);
      const fields = res.body.error.details.map((d: { field: string }) => d.field);
      expect(fields).toEqual(expect.arrayContaining(['name', 'organization', 'type', 'inputModalities', 'outputModalities']));
    });

    it('nothing is written when validation fails mid-transaction (unknown capability)', async () => {
      await http().post('/api/v1/models').set(auth).send(newModel({ slug: 'atomic', capabilities: ['nope'] })).expect(400);
      await http().get('/api/v1/models/atomic').expect(404);
    });
  });

  describe('case-insensitive alphabetical sorting (regression)', () => {
    it('sorts names alphabetically regardless of case or server collation', async () => {
      // With byte ("C") collation, lowercase names sorted after every capitalised one ("o1" after "Whisper").
      for (const name of ['omega lower', 'Zulu']) {
        await http().post('/api/v1/models').set(auth).send(newModel({ name, capabilities: [] })).expect(201);
      }
      const res = await http().get('/api/v1/models?sort=name').expect(200);
      expect(res.body.data.map((m: { name: string }) => m.name)).toEqual(['Alpha 1', 'Alpha 2', 'Beta 1', 'Beta Coder', 'Beta Old', 'omega lower', 'Zulu']);
      const desc = await http().get('/api/v1/models?sort=name&order=desc').expect(200);
      expect(desc.body.data[0].name).toBe('Zulu');

      await http().post('/api/v1/organizations').set(auth).send({ name: 'aardvark labs', type: 'STARTUP' }).expect(201);
      const orgs = await http().get('/api/v1/organizations').expect(200);
      expect(orgs.body.data[0].slug).toBe('aardvark-labs');

      await http().post('/api/v1/providers').set(auth).send({ name: 'bedrock-ish' }).expect(201);
      const provs = await http().get('/api/v1/providers').expect(200);
      expect(provs.body.data.map((p: { name: string }) => p.name)).toEqual(['bedrock-ish', 'Cloud A', 'Cloud B', 'Cloud C']);
    });

    it('the sort key follows renames (maintained by the database)', async () => {
      await http().patch('/api/v1/models/beta-old').set(auth).send({ name: 'aaa renamed' }).expect(200);
      const res = await http().get('/api/v1/models?sort=name&pageSize=1').expect(200);
      expect(res.body.data[0].slug).toBe('beta-old');
    });

    it('orders by code point regardless of the server collation (spaces/punctuation are significant)', async () => {
      // Language collations such as glibc en_US ignore spaces and punctuation at the first level and would
      // tie these three names; the API guarantees the same order on every server (column COLLATE "C").
      for (const [slug, name] of [['zz-c', 'zz.c'], ['zz-b', 'zz-c'], ['zz-a', 'zz c']]) {
        await http().post('/api/v1/models').set(auth).send(newModel({ slug, name, capabilities: [] })).expect(201);
      }
      const res = await http().get('/api/v1/models?sort=name&q=zz').expect(200);
      expect(res.body.data.map((m: { name: string }) => m.name)).toEqual(['zz c', 'zz-c', 'zz.c']);
      const col = await t.prisma.$queryRaw<{ table_name: string; collation_name: string }[]>`
        SELECT table_name, collation_name FROM information_schema.columns WHERE column_name = 'nameSortKey' ORDER BY table_name`;
      expect(col).toEqual([
        { table_name: 'Model', collation_name: 'C' },
        { table_name: 'Organization', collation_name: 'C' },
        { table_name: 'Provider', collation_name: 'C' },
      ]);
    });
  });

  describe('PATCH /models/:slug', () => {
    it('partially updates fields and leaves others untouched', async () => {
      const res = await http().patch('/api/v1/models/alpha-1').set(auth).send({ name: 'Alpha One', status: 'DEPRECATED' }).expect(200);
      expect(res.body).toMatchObject({ slug: 'alpha-1', name: 'Alpha One', status: 'DEPRECATED', contextWindow: 128000, description: 'General purpose chat' });
    });

    it('replaces the capability set when provided ([] clears it)', async () => {
      let res = await http().patch('/api/v1/models/alpha-1').set(auth).send({ capabilities: ['vision'] }).expect(200);
      expect(res.body.capabilities.map((c: { slug: string }) => c.slug)).toEqual(['vision']);
      res = await http().patch('/api/v1/models/alpha-1').set(auth).send({ capabilities: [] }).expect(200);
      expect(res.body.capabilities).toEqual([]);
    });

    it('null clears nullable fields', async () => {
      const res = await http().patch('/api/v1/models/alpha-1').set(auth).send({ description: null, releaseDate: null, maxOutputTokens: null }).expect(200);
      expect(res.body).toMatchObject({ description: null, releaseDate: null, maxOutputTokens: null });
    });

    it.each(['name', 'type', 'organization', 'inputModalities', 'capabilities', 'openWeights'])('null is rejected for non-nullable %s', async (field) => {
      const res = await http().patch('/api/v1/models/alpha-1').set(auth).send({ [field]: null }).expect(400);
      expect(res.body.error.details[0].field).toBe(field);
    });

    it('moves a model to another organization', async () => {
      const res = await http().patch('/api/v1/models/alpha-1').set(auth).send({ organization: 'gamma-labs' }).expect(200);
      expect(res.body.organization.slug).toBe('gamma-labs');
    });

    it('renaming the slug works and the old slug 404s; colliding slug 409s', async () => {
      await http().patch('/api/v1/models/alpha-1').set(auth).send({ slug: 'alpha-1-renamed' }).expect(200);
      await http().get('/api/v1/models/alpha-1').expect(404);
      await http().get('/api/v1/models/alpha-1-renamed').expect(200);
      await http().patch('/api/v1/models/alpha-1-renamed').set(auth).send({ slug: 'alpha-2' }).expect(409);
    });

    it('validates token limits against the stored context window', async () => {
      const res = await http().patch('/api/v1/models/alpha-1').set(auth).send({ maxOutputTokens: 200000 }).expect(400);
      expect(res.body.error.details[0].field).toBe('maxOutputTokens');
      await http().patch('/api/v1/models/alpha-1').set(auth).send({ maxOutputTokens: 200000, contextWindow: 300000 }).expect(200);
    });

    it('404 for unknown model; 400 for unknown organization', async () => {
      await http().patch('/api/v1/models/ghost').set(auth).send({ name: 'x' }).expect(404);
      await http().patch('/api/v1/models/alpha-1').set(auth).send({ organization: 'ghost-org' }).expect(400);
    });
  });

  describe('DELETE /models/:slug', () => {
    it('deletes and cascades offerings + benchmark results', async () => {
      await http().delete('/api/v1/models/alpha-1').set(auth).expect(204);
      await http().get('/api/v1/models/alpha-1').expect(404);
      await http().delete('/api/v1/models/alpha-1').set(auth).expect(404);
      expect(await t.prisma.modelProvider.count({ where: { providerModelId: { startsWith: 'a/alpha-1' } } })).toBe(0);
      const board = await http().get('/api/v1/rankings?benchmark=know-1').expect(200);
      expect(board.body.data.map((e: { model: { slug: string } }) => e.model.slug)).not.toContain('alpha-1');
    });
  });

  describe('PUT/DELETE /models/:slug/providers/:provider (pricing management)', () => {
    const offer = (over: Record<string, unknown> = {}) => ({ providerModelId: 'b/alpha-2', inputPricePerMTok: 1, outputPricePerMTok: 2, ...over });

    it('creates an offering and recomputes the model price summary atomically', async () => {
      const res = await http().put('/api/v1/models/alpha-2/providers/cloud-b').set(auth).send(offer({ cachedInputPerMTok: 0.5, uptimePct: 99.9 })).expect(200);
      expect(res.body).toMatchObject({ provider: { slug: 'cloud-b' }, inputPricePerMTok: 1, outputPricePerMTok: 2, cachedInputPerMTok: 0.5, uptimePct: 99.9, isAvailable: true });
      const m = await http().get('/api/v1/models/alpha-2').expect(200);
      expect(m.body.pricing).toMatchObject({ minInputPricePerMTok: 1, minOutputPricePerMTok: 2, providerCount: 2 });
      // and it immediately affects price sorting/filtering
      const list = await http().get('/api/v1/models?maxInputPrice=1').expect(200);
      expect(list.body.data.map((x: { slug: string }) => x.slug)).toContain('alpha-2');
    });

    it('is idempotent and has full-replace (PUT) semantics', async () => {
      await http().put('/api/v1/models/alpha-2/providers/cloud-b').set(auth).send(offer({ cachedInputPerMTok: 0.5, avgLatencyMs: 300 })).expect(200);
      const res = await http().put('/api/v1/models/alpha-2/providers/cloud-b').set(auth).send(offer()).expect(200);
      expect(res.body).toMatchObject({ cachedInputPerMTok: null, avgLatencyMs: null });
      expect(await t.prisma.modelProvider.count({ where: { model: { slug: 'alpha-2' } } })).toBe(2);
    });

    it('price increases on the cheapest provider move the summary up', async () => {
      await http().put('/api/v1/models/alpha-1/providers/cloud-b').set(auth).send({ providerModelId: 'b/alpha-1', inputPricePerMTok: 7, outputPricePerMTok: 7 }).expect(200);
      const m = await http().get('/api/v1/models/alpha-1');
      expect(m.body.pricing).toMatchObject({ minInputPricePerMTok: 1, minOutputPricePerMTok: 2 });
    });

    it('marking an offering unavailable removes it from the summary and provider filter', async () => {
      await http().put('/api/v1/models/alpha-1/providers/cloud-b').set(auth).send({ providerModelId: 'b/alpha-1', inputPricePerMTok: 0.5, outputPricePerMTok: 3, isAvailable: false }).expect(200);
      const m = await http().get('/api/v1/models/alpha-1');
      expect(m.body.pricing).toMatchObject({ minInputPricePerMTok: 1, providerCount: 1 });
      const list = await http().get('/api/v1/models?provider=cloud-b');
      expect(list.body.data.map((x: { slug: string }) => x.slug)).not.toContain('alpha-1');
    });

    it('free pricing (0) is valid and sorts first', async () => {
      await http().put('/api/v1/models/beta-code/providers/cloud-c').set(auth).send({ providerModelId: 'c/free', inputPricePerMTok: 0, outputPricePerMTok: 0 }).expect(200);
      const list = await http().get('/api/v1/models?sort=inputPrice');
      expect(list.body.data[0]).toMatchObject({ slug: 'beta-code', pricing: { minInputPricePerMTok: 0 } });
    });

    it('preserves decimal precision (6dp)', async () => {
      await http().put('/api/v1/models/beta-code/providers/cloud-c').set(auth).send({ providerModelId: 'c/x', inputPricePerMTok: 0.123456, outputPricePerMTok: 1.000001 }).expect(200);
      const m = await http().get('/api/v1/models/beta-code');
      expect(m.body.providers[0]).toMatchObject({ inputPricePerMTok: 0.123456, outputPricePerMTok: 1.000001 });
    });

    it('DELETE removes the offering and recomputes; second delete 404s', async () => {
      await http().delete('/api/v1/models/alpha-2/providers/cloud-a').set(auth).expect(204);
      const m = await http().get('/api/v1/models/alpha-2');
      expect(m.body.pricing).toMatchObject({ minInputPricePerMTok: null, minOutputPricePerMTok: null, providerCount: 0 });
      await http().delete('/api/v1/models/alpha-2/providers/cloud-a').set(auth).expect(404);
    });

    it.each([
      [{ inputPricePerMTok: -1 }, 'inputPricePerMTok'],
      [{ outputPricePerMTok: 'cheap' }, 'outputPricePerMTok'],
      [{ inputPricePerMTok: 0.1234567 }, 'inputPricePerMTok'], // > 6dp
      [{ cachedInputPerMTok: 5 }, 'cachedInputPerMTok'], // > input price
      [{ uptimePct: 101 }, 'uptimePct'],
      [{ providerModelId: '' }, 'providerModelId'],
      [{ avgLatencyMs: -5 }, 'avgLatencyMs'],
      [{ providerModelId: undefined }, 'providerModelId'],
    ])('400 for %j', async (over, field) => {
      const res = await http().put('/api/v1/models/alpha-2/providers/cloud-b').set(auth).send(offer(over)).expect(400);
      expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
    });

    it('404 for unknown model or provider', async () => {
      await http().put('/api/v1/models/ghost/providers/cloud-b').set(auth).send(offer()).expect(404);
      const res = await http().put('/api/v1/models/alpha-2/providers/ghost').set(auth).send(offer()).expect(404);
      expect(res.body.error.message).toContain("Provider 'ghost'");
    });

    it('deleting a provider recomputes the price summary of every model it served', async () => {
      await http().delete('/api/v1/providers/cloud-b').set(auth).expect(204);
      const [a1, b1, bOld] = await Promise.all(['alpha-1', 'beta-1', 'beta-old'].map((s) => http().get(`/api/v1/models/${s}`)));
      expect(a1.body.pricing).toMatchObject({ minInputPricePerMTok: 1, minOutputPricePerMTok: 2, providerCount: 1 });
      expect(b1.body.pricing).toMatchObject({ minInputPricePerMTok: null, providerCount: 0 }); // only an unavailable offering remains
      expect(bOld.body.pricing).toMatchObject({ minInputPricePerMTok: null, providerCount: 0 });
    });

    it('concurrent offering writes for one model never leave a stale price summary (row-locking)', async () => {
      // Many providers writing offers for the SAME model in parallel. Without serialising on the model row,
      // two transactions can each recompute the summary without seeing the other's insert.
      const extra = await Promise.all(
        Array.from({ length: 8 }, (_, i) => t.prisma.provider.create({ data: { slug: `race-${i}`, name: `Race ${i}` } })),
      );
      for (let round = 0; round < 5; round++) {
        const responses = await Promise.all(
          extra.map((p, i) =>
            http()
              .put(`/api/v1/models/alpha-2/providers/${p.slug}`)
              .set(auth)
              .send({ providerModelId: `${p.slug}/a2`, inputPricePerMTok: round + i + 0.5, outputPricePerMTok: round + i + 1 }),
          ),
        );
        expect(responses.map((r) => r.status)).toEqual(extra.map(() => 200));
        expect(await pricingInconsistencies(t.prisma)).toEqual([]);
      }
      const m = await http().get('/api/v1/models/alpha-2');
      expect(m.body.pricing).toMatchObject({ providerCount: 9, minInputPricePerMTok: 4.5, minOutputPricePerMTok: 5 });

      // Concurrent deletes as well
      await Promise.all(extra.map((p) => http().delete(`/api/v1/models/alpha-2/providers/${p.slug}`).set(auth).expect(204)));
      const after = await http().get('/api/v1/models/alpha-2');
      expect(after.body.pricing).toMatchObject({ providerCount: 1, minInputPricePerMTok: 10, minOutputPricePerMTok: 40 });
    });
  });

  describe('PUT/DELETE /models/:slug/benchmarks/:benchmark (benchmark data management)', () => {
    it('creates/updates a score and it is reflected in detail and rankings', async () => {
      let res = await http().put('/api/v1/models/beta-1/benchmarks/code-1').set(auth).send({ score: 99, sourceUrl: 'https://example.com/paper', measuredAt: '2025-01-01' }).expect(200);
      expect(res.body).toMatchObject({ score: 99, normalizedScore: 99, sourceUrl: 'https://example.com/paper', measuredAt: '2025-01-01', benchmark: { slug: 'code-1' } });
      let board = await http().get('/api/v1/rankings?benchmark=code-1');
      expect(board.body.data[0]).toMatchObject({ rank: 1, model: { slug: 'beta-1' }, score: 99 });

      res = await http().put('/api/v1/models/beta-1/benchmarks/code-1').set(auth).send({ score: 1 }).expect(200);
      expect(res.body).toMatchObject({ score: 1, sourceUrl: null });
      board = await http().get('/api/v1/rankings?benchmark=code-1');
      expect(board.body.data.at(-1)).toMatchObject({ model: { slug: 'beta-1' } });
      expect(await t.prisma.benchmarkResult.count({ where: { model: { slug: 'beta-1' }, benchmark: { slug: 'code-1' } } })).toBe(1);
    });

    it('validates the score against the benchmark scale', async () => {
      let res = await http().put('/api/v1/models/beta-1/benchmarks/elo-1').set(auth).send({ score: 500 }).expect(400);
      expect(res.body.error.details[0]).toMatchObject({ field: 'score', messages: [expect.stringContaining('between 800 and 1600')] });
      await http().put('/api/v1/models/beta-1/benchmarks/elo-1').set(auth).send({ score: 1600 }).expect(200);
      res = await http().put('/api/v1/models/beta-1/benchmarks/know-1').set(auth).send({ score: 100.5 }).expect(400);
      await http().put('/api/v1/models/beta-1/benchmarks/know-1').set(auth).send({ score: 'high' }).expect(400);
      await http().put('/api/v1/models/beta-1/benchmarks/know-1').set(auth).send({ score: 50, sourceUrl: 'not a url' }).expect(400);
    });

    it('404 for unknown model/benchmark; DELETE then 404', async () => {
      await http().put('/api/v1/models/ghost/benchmarks/know-1').set(auth).send({ score: 1 }).expect(404);
      await http().put('/api/v1/models/beta-1/benchmarks/ghost').set(auth).send({ score: 1 }).expect(404);
      await http().delete('/api/v1/models/alpha-1/benchmarks/know-1').set(auth).expect(204);
      await http().delete('/api/v1/models/alpha-1/benchmarks/know-1').set(auth).expect(404);
    });
  });

  describe('database-level integrity (defence in depth)', () => {
    it('CHECK constraints reject negative prices even if the API layer is bypassed', async () => {
      const [m, p] = await Promise.all([t.prisma.model.findUniqueOrThrow({ where: { slug: 'beta-code' } }), t.prisma.provider.findUniqueOrThrow({ where: { slug: 'cloud-c' } })]);
      await expect(
        t.prisma.modelProvider.create({ data: { modelId: m.id, providerId: p.id, providerModelId: 'x', inputPricePerMTok: -1, outputPricePerMTok: 1 } }),
      ).rejects.toThrow(/check constraint/i);
    });

    it('CHECK constraints reject non-positive context windows and invalid benchmark ranges', async () => {
      await expect(t.prisma.model.update({ where: { slug: 'beta-code' }, data: { contextWindow: 0 } })).rejects.toThrow(/check constraint/i);
      await expect(t.prisma.benchmark.update({ where: { slug: 'know-1' }, data: { maxScore: -1 } })).rejects.toThrow(/check constraint/i);
    });

    it('unique (model, provider) prevents duplicate offerings', async () => {
      const [m, p] = await Promise.all([t.prisma.model.findUniqueOrThrow({ where: { slug: 'alpha-1' } }), t.prisma.provider.findUniqueOrThrow({ where: { slug: 'cloud-a' } })]);
      await expect(
        t.prisma.modelProvider.create({ data: { modelId: m.id, providerId: p.id, providerModelId: 'dup', inputPricePerMTok: 1, outputPricePerMTok: 1 } }),
      ).rejects.toMatchObject({ code: 'P2002' });
    });
  });
});
