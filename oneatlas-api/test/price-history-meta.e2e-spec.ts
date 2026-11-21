import request from 'supertest';
import { auth, createTestApp, TestApp } from './helpers/app';
import { priceHistoryInconsistencies, pricingInconsistencies, seedFixtures } from './helpers/fixtures';

type Event = { provider: { slug: string }; change: string; inputPricePerMTok: number; outputPricePerMTok: number; isAvailable: boolean; source: string; recordedAt: string };

describe('Price history (pricing data management) — e2e', () => {
  let t: TestApp;
  const http = () => request(t.app.getHttpServer());
  const history = async (slug: string, qs = '') => (await http().get(`/api/v1/models/${slug}/price-history${qs}`).expect(200)).body as { data: Event[]; meta: { total: number } };
  const offer = (over: Record<string, unknown> = {}) => ({ providerModelId: 'x', inputPricePerMTok: 1, outputPricePerMTok: 2, ...over });

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(() => seedFixtures(t.prisma));
  afterEach(async () => {
    expect(await pricingInconsistencies(t.prisma)).toEqual([]);
    expect(await priceHistoryInconsistencies(t.prisma)).toEqual([]);
  });
  afterAll(() => t.close());

  it('every existing offering starts with a CREATED event', async () => {
    const h = await history('alpha-1');
    expect(h.meta.total).toBe(2);
    expect(h.data.map((e) => [e.provider.slug, e.change])).toEqual(expect.arrayContaining([['cloud-a', 'CREATED'], ['cloud-b', 'CREATED']]));
  });

  it('records CREATED → UPDATED → REMOVED, newest first, with prices at each point', async () => {
    await http().put('/api/v1/models/alpha-2/providers/cloud-b').set(auth).send(offer()).expect(200);
    await http().put('/api/v1/models/alpha-2/providers/cloud-b').set(auth).send(offer({ inputPricePerMTok: 0.8 })).expect(200);
    await http().delete('/api/v1/models/alpha-2/providers/cloud-b').set(auth).expect(204);

    const h = await history('alpha-2', '?provider=cloud-b');
    expect(h.data.map((e) => [e.change, e.inputPricePerMTok, e.outputPricePerMTok, e.isAvailable, e.source])).toEqual([
      ['REMOVED', 0.8, 2, false, 'api'],
      ['UPDATED', 0.8, 2, true, 'api'],
      ['CREATED', 1, 2, true, 'api'],
    ]);
    const times = h.data.map((e) => Date.parse(e.recordedAt));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it('re-saving identical prices is not an event; changing only provider metadata is not an event', async () => {
    const before = (await history('alpha-1')).meta.total;
    await http().put('/api/v1/models/alpha-1/providers/cloud-a').set(auth).send({ providerModelId: 'a/alpha-1', inputPricePerMTok: 1, outputPricePerMTok: 2 }).expect(200);
    await http().put('/api/v1/models/alpha-1/providers/cloud-a').set(auth).send({ providerModelId: 'renamed-id', inputPricePerMTok: 1, outputPricePerMTok: 2, avgLatencyMs: 300 }).expect(200);
    expect((await history('alpha-1')).meta.total).toBe(before);
  });

  it('availability and cached-price changes are recorded', async () => {
    await http().put('/api/v1/models/alpha-1/providers/cloud-a').set(auth).send({ providerModelId: 'a', inputPricePerMTok: 1, outputPricePerMTok: 2, isAvailable: false }).expect(200);
    await http().put('/api/v1/models/alpha-1/providers/cloud-a').set(auth).send({ providerModelId: 'a', inputPricePerMTok: 1, outputPricePerMTok: 2, cachedInputPerMTok: 0.5 }).expect(200);
    const h = await history('alpha-1', '?provider=cloud-a');
    expect(h.data.map((e) => [e.change, e.isAvailable])).toEqual([['UPDATED', true], ['UPDATED', false], ['CREATED', true]]);
  });

  it('ingestion writes history with its source, and re-ingesting unchanged data writes nothing', async () => {
    const rec = (price: string) => ({ id: 'alpha-lab/alpha-1', name: 'Alpha 1', pricing: { prompt: price, completion: '0.000002' } });
    await http().post('/api/v1/ingest/models').set(auth).send({ provider: 'cloud-c', models: [rec('0.0000003')] }).expect(200);
    await http().post('/api/v1/ingest/models').set(auth).send({ provider: 'cloud-c', models: [rec('0.0000003')] }).expect(200);
    await http().post('/api/v1/ingest/models').set(auth).send({ provider: 'cloud-c', models: [rec('0.0000004')] }).expect(200);
    const h = await history('alpha-1', '?provider=cloud-c');
    expect(h.data.map((e) => [e.change, e.inputPricePerMTok, e.source])).toEqual([
      ['UPDATED', 0.4, 'ingestion:cloud-c'],
      ['CREATED', 0.3, 'ingestion:cloud-c'],
    ]);
  });

  it('history order stays correct under concurrent price updates (row-locked writers)', async () => {
    const prices = [1, 2, 3, 4, 5, 6, 7, 8];
    await Promise.all(prices.map((p) => http().put('/api/v1/models/alpha-2/providers/cloud-b').set(auth).send(offer({ inputPricePerMTok: p, outputPricePerMTok: p }))));
    const h = await history('alpha-2', '?provider=cloud-b&pageSize=100');
    expect(h.data[h.data.length - 1].change).toBe('CREATED');
    expect(h.data.length).toBe(prices.length); // 1 CREATED + 7 UPDATED (all prices differ)
    // afterEach proves the newest event equals the final stored price
  });

  it('paginates and validates', async () => {
    for (const p of [1, 2, 3]) await http().put('/api/v1/models/alpha-2/providers/cloud-b').set(auth).send(offer({ inputPricePerMTok: p })).expect(200);
    const page = await http().get('/api/v1/models/alpha-2/price-history?pageSize=2&page=2').expect(200);
    expect(page.body.meta).toMatchObject({ total: 4, totalPages: 2, page: 2 });
    expect(page.body.data).toHaveLength(2);
    await http().get('/api/v1/models/ghost/price-history').expect(404);
    await http().get('/api/v1/models/alpha-1/price-history?provider=ghost').expect(404);
    await http().get('/api/v1/models/alpha-1/price-history?provider=Bad_Slug').expect(400);
    await http().get('/api/v1/models/alpha-1/price-history?pageSize=0').expect(400);
  });

  it('history is deleted with its model or provider (no orphans)', async () => {
    await http().delete('/api/v1/models/alpha-1').set(auth).expect(204);
    await http().delete('/api/v1/providers/cloud-b').set(auth).expect(204);
    const orphans = await t.prisma.$queryRaw<{ c: number }[]>`
      SELECT COUNT(*)::int c FROM "PriceHistory" h WHERE NOT EXISTS (SELECT 1 FROM "Model" m WHERE m.id = h."modelId") OR NOT EXISTS (SELECT 1 FROM "Provider" p WHERE p.id = h."providerId")`;
    expect(orphans[0].c).toBe(0);
    expect(await t.prisma.priceHistory.count({ where: { provider: { slug: 'cloud-b' } } })).toBe(0);
  });

  it('the database rejects negative prices in history (CHECK constraint)', async () => {
    const m = await t.prisma.model.findUniqueOrThrow({ where: { slug: 'alpha-1' } });
    const p = await t.prisma.provider.findUniqueOrThrow({ where: { slug: 'cloud-a' } });
    await expect(
      t.prisma.priceHistory.create({ data: { modelId: m.id, providerId: p.id, change: 'UPDATED', inputPricePerMTok: -1, outputPricePerMTok: 1, isAvailable: true, source: 'test' } }),
    ).rejects.toThrow(/check constraint/i);
  });
});

describe('GET /meta — single source of truth for client UIs (e2e)', () => {
  let t: TestApp;
  const meta = async () => (await request(t.app.getHttpServer()).get('/api/v1/meta').expect(200)).body;

  beforeAll(async () => {
    t = await createTestApp();
    await seedFixtures(t.prisma);
  });
  afterAll(() => t.close());

  it('facets are derived from the data with exact live counts (options without models are omitted)', async () => {
    const m = await meta();
    expect(m.facets.totalModels).toBe(5);
    expect(m.facets.modelTypes).toEqual([
      { value: 'CHAT', label: 'Chat', count: 3 },
      { value: 'REASONING', label: 'Reasoning', count: 1 },
      { value: 'CODE', label: 'Code', count: 1 },
    ]);
    expect(m.facets.statuses).toEqual([
      { value: 'PREVIEW', label: 'Preview', count: 1 },
      { value: 'ACTIVE', label: 'Active', count: 3 },
      { value: 'DEPRECATED', label: 'Deprecated', count: 1 },
    ]);
    expect(m.facets.inputModalities).toEqual([{ value: 'IMAGE', label: 'Image', count: 1 }, { value: 'TEXT', label: 'Text', count: 5 }]);
    expect(m.facets.organizations).toEqual([
      { slug: 'alpha-lab', name: 'Alpha Lab', count: 2 },
      { slug: 'beta-corp', name: 'Beta Corp', count: 3 }, // gamma-labs has no models → omitted
    ]);
    expect(m.facets.providers).toEqual([
      { slug: 'cloud-a', name: 'Cloud A', count: 2 }, // beta-1 on cloud-a is unavailable → not counted
      { slug: 'cloud-b', name: 'Cloud B', count: 3 }, // cloud-c has no models → omitted
    ]);
    expect(m.facets.capabilities.map((c: { slug: string; count: number }) => [c.slug, c.count])).toEqual([
      ['json-mode', 2], ['reasoning', 1], ['tool-calling', 2], ['vision', 1],
    ]);
    expect(m.facets.benchmarkCategories).toEqual([
      { value: 'CODING', label: 'Coding', benchmarks: 2, results: 5 },
      { value: 'GENERAL_KNOWLEDGE', label: 'General knowledge', benchmarks: 2, results: 6 },
      { value: 'REASONING', label: 'Reasoning', benchmarks: 1, results: 2 },
    ]);
    expect(m.facets.contextWindows).toEqual([
      { min: 32000, label: '≥ 32K', count: 3 },
      { min: 128000, label: '≥ 128K', count: 2 },
      { min: 200000, label: '≥ 200K', count: 1 }, // ≥ 1M has no models → omitted
    ]);
    expect(m.facets.inputPrice).toEqual({ min: 0.2, max: 10 });
    expect(m.facets.openWeights).toBe(2);
  });

  it('every facet count agrees with the corresponding /models filter', async () => {
    const m = await meta();
    const total = async (qs: string) => (await request(t.app.getHttpServer()).get(`/api/v1/models?${qs}`).expect(200)).body.meta.total;
    for (const f of m.facets.modelTypes) expect(await total(`type=${f.value}`)).toBe(f.count);
    for (const f of m.facets.organizations) expect(await total(`organization=${f.slug}`)).toBe(f.count);
    for (const f of m.facets.providers) expect(await total(`provider=${f.slug}`)).toBe(f.count);
    for (const f of m.facets.capabilities) expect(await total(`capability=${f.slug}`)).toBe(f.count);
    for (const f of m.facets.inputModalities) expect(await total(`inputModality=${f.value}`)).toBe(f.count);
    for (const f of m.facets.contextWindows) expect(await total(`minContext=${f.min}`)).toBe(f.count);
    expect(await total('openWeights=true')).toBe(m.facets.openWeights);
  });

  it('labels, sort options and limits are served (clients keep no copies)', async () => {
    const m = await meta();
    expect(m.enums.modelTypes).toHaveLength(9);
    expect(m.enums.benchmarkCategories.find((c: { value: string }) => c.value === 'LONG_CONTEXT').label).toBe('Long context');
    expect(m.enums.priceChanges.map((c: { value: string }) => c.value)).toEqual(['CREATED', 'UPDATED', 'REMOVED']);
    expect(m.sorts.find((s: { value: string }) => s.value === 'inputPrice')).toEqual({ value: 'inputPrice', label: 'Input price', defaultOrder: 'asc' });
    expect(m.sortPresets[0]).toEqual({ sort: 'releaseDate', order: 'desc', label: 'Newest' });
    expect(m.limits).toEqual({ maxPageSize: 100, compare: { min: 2, max: 6 } });
  });

  it('every sort preset is accepted by /models (no client/server drift)', async () => {
    const m = await meta();
    for (const p of m.sortPresets) await request(t.app.getHttpServer()).get(`/api/v1/models?sort=${p.sort}&order=${p.order}`).expect(200);
  });

  it('counts update live when data changes', async () => {
    await request(t.app.getHttpServer())
      .post('/api/v1/models')
      .set(auth)
      .send({ name: 'Gamma One', organization: 'gamma-labs', type: 'EMBEDDING', inputModalities: ['TEXT'], outputModalities: ['EMBEDDING'], contextWindow: 2_000_000 })
      .expect(201);
    const m = await meta();
    expect(m.facets.organizations.map((o: { slug: string }) => o.slug)).toContain('gamma-labs');
    expect(m.facets.modelTypes).toContainEqual({ value: 'EMBEDDING', label: 'Embedding', count: 1 });
    expect(m.facets.contextWindows).toContainEqual({ min: 1000000, label: '≥ 1M', count: 1 });
    expect(m.facets.outputModalities).toContainEqual({ value: 'EMBEDDING', label: 'Embedding', count: 1 });
  });
});
