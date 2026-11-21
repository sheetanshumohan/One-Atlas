import request from 'supertest';
import { auth, createTestApp, TestApp } from './helpers/app';
import { pricingInconsistencies, seedFixtures } from './helpers/fixtures';

const record = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  name: `Vendor: ${id.split('/')[1]}`,
  created: 1735689600, // 2025-01-01
  context_length: 64000,
  architecture: { modality: 'text+image->text' },
  pricing: { prompt: '0.0000003', completion: '0.0000009' },
  top_provider: { max_completion_tokens: 4096 },
  supported_parameters: ['tools', 'response_format'],
  ...over,
});

describe('Data ingestion & normalisation (e2e)', () => {
  let t: TestApp;
  const ingest = (body: unknown) => request(t.app.getHttpServer()).post('/api/v1/ingest/models').set(auth).send(body as object);

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(() => seedFixtures(t.prisma));
  afterEach(async () => expect(await pricingInconsistencies(t.prisma)).toEqual([]));
  afterAll(() => t.close());

  const batch = [
    record('newlab/nova-7b', { hugging_face_id: 'newlab/nova-7b' }), // 0 created (+ new org)
    record('meta-llama/llama-x-70b'), // 1 created under canonical org "meta" (alias)
    record('alpha-lab/alpha-1', { pricing: { prompt: '0.0000001', completion: '0.0000002' }, context_length: null, description: 'From feed' }), // 2 updated
    record('newlab/nova-7b:free'), // 3 skipped (variant)
    record('newlab/router', { pricing: { prompt: '-1', completion: '-1' } }), // 4 skipped (dynamic)
    { id: 'broken' }, // 5 error
    record('otherlab/nova-7b'), // 6 skipped: duplicate slug inside batch
    record('beta-corp/alpha-2'), // 7 error: slug owned by a different org
    'not-an-object', // 8 error
  ];

  it('normalises, writes valid records and reports every rejected one with a reason', async () => {
    const res = await ingest({ provider: 'cloud-c', models: batch }).expect(200);
    expect(res.body).toMatchObject({ provider: 'cloud-c', dryRun: false, received: 9, created: 2, updated: 1, organizationsCreated: ['meta', 'newlab'] });
    expect(res.body.skipped.map((s: { index: number }) => s.index)).toEqual([3, 4, 6]);
    expect(res.body.errors.map((e: { index: number }) => e.index)).toEqual([5, 7, 8]);
    expect(res.body.errors.find((e: { index: number }) => e.index === 7).reason).toMatch(/different organization/);
    expect(res.body.preview).toBeUndefined();

    const nova = (await request(t.app.getHttpServer()).get('/api/v1/models/nova-7b').expect(200)).body;
    expect(nova).toMatchObject({
      name: 'nova-7b',
      organization: { slug: 'newlab', name: 'Newlab' },
      type: 'CHAT',
      releaseDate: '2025-01-01',
      contextWindow: 64000,
      maxOutputTokens: 4096,
      openWeights: true,
      inputModalities: ['TEXT', 'IMAGE'],
      pricing: { minInputPricePerMTok: 0.3, minOutputPricePerMTok: 0.9, providerCount: 1 },
    });
    expect(nova.capabilities.map((c: { slug: string }) => c.slug)).toEqual(['json-mode', 'tool-calling', 'vision']);
    expect(nova.providers[0]).toMatchObject({ provider: { slug: 'cloud-c' }, providerModelId: 'newlab/nova-7b', inputPricePerMTok: 0.3 });

    const llama = (await request(t.app.getHttpServer()).get('/api/v1/models/llama-x-70b').expect(200)).body;
    expect(llama.organization.slug).toBe('meta');
  });

  it('updates existing models without erasing curated data, merging capabilities', async () => {
    await ingest({ provider: 'cloud-c', models: batch }).expect(200);
    const a1 = (await request(t.app.getHttpServer()).get('/api/v1/models/alpha-1').expect(200)).body;
    expect(a1).toMatchObject({
      description: 'From feed',
      contextWindow: 128000, // feed had null → curated value kept
      openWeights: false, // feed had no HF id → unknown → not overwritten
      pricing: { minInputPricePerMTok: 0.1, minOutputPricePerMTok: 0.2, providerCount: 3 }, // new cheapest provider
    });
    // curated capabilities kept + feed-derived ones added
    expect(a1.capabilities.map((c: { slug: string }) => c.slug)).toEqual(['json-mode', 'tool-calling', 'vision']);
  });

  it('is idempotent: re-running the same payload creates nothing new', async () => {
    await ingest({ provider: 'cloud-c', models: batch }).expect(200);
    const counts = async () => Promise.all([t.prisma.model.count(), t.prisma.modelProvider.count(), t.prisma.organization.count(), t.prisma.capability.count()]);
    const before = await counts();
    const res = await ingest({ provider: 'cloud-c', models: batch }).expect(200);
    expect(res.body).toMatchObject({ created: 0, updated: 3, organizationsCreated: [] });
    expect(await counts()).toEqual(before);
  });

  it('dryRun validates and previews without writing anything', async () => {
    const before = await t.prisma.model.count();
    const res = await ingest({ provider: 'cloud-c', dryRun: true, models: batch }).expect(200);
    expect(res.body).toMatchObject({ dryRun: true, created: 0, updated: 0 });
    expect(res.body.preview).toHaveLength(4); // records 0, 1, 2, 7 normalise fine; 7 only fails at write time
    expect(res.body.preview[0]).toMatchObject({ slug: 'nova-7b', organizationSlug: 'newlab', offering: { inputPricePerMTok: 0.3, outputPricePerMTok: 0.9 } });
    expect(await t.prisma.model.count()).toBe(before);
  });

  it('exact decimal conversion end-to-end (no float drift)', async () => {
    await ingest({ provider: 'cloud-c', models: [record('newlab/precise', { pricing: { prompt: '0.0000029', completion: '0.00000079' } })] }).expect(200);
    const m = (await request(t.app.getHttpServer()).get('/api/v1/models/precise')).body;
    expect(m.providers[0]).toMatchObject({ inputPricePerMTok: 2.9, outputPricePerMTok: 0.79 });
  });

  it.each([
    [{ provider: 'ghost', models: [record('a/b')] }, 404],
    [{ provider: 'cloud-c', models: [] }, 400],
    [{ provider: 'cloud-c', models: 'nope' }, 400],
    [{ provider: 'cloud-c' }, 400],
    [{ provider: 'cloud-c', models: [record('a/b')], dryRun: 'yes' }, 400],
    [{ provider: 'cloud-c', models: Array.from({ length: 1001 }, (_, i) => record(`x/m-${i}`)) }, 400],
  ])('rejects invalid requests (%#)', async (body, status) => {
    await ingest(body).expect(status);
  });

  it('requires the admin key', async () => {
    await request(t.app.getHttpServer()).post('/api/v1/ingest/models').send({ provider: 'cloud-c', models: [record('a/b')] }).expect(401);
  });

  it('POST /ingest/recompute-pricing repairs a corrupted summary', async () => {
    await t.prisma.model.update({ where: { slug: 'alpha-1' }, data: { minInputPrice: 999, providerCount: 42 } });
    expect(await pricingInconsistencies(t.prisma)).toEqual(['alpha-1']);
    const res = await request(t.app.getHttpServer()).post('/api/v1/ingest/recompute-pricing').set(auth).expect(200);
    expect(res.body.modelsUpdated).toBe(5);
    expect(await pricingInconsistencies(t.prisma)).toEqual([]);
  });

  it('ingests a realistic 300-record batch within a reasonable time', async () => {
    const big = Array.from({ length: 300 }, (_, i) => record(`bulklab/model-${i}`, { pricing: { prompt: `${(i + 1) / 1e7}`, completion: `${(i + 1) / 1e6}` } }));
    const started = Date.now();
    const res = await ingest({ provider: 'cloud-c', models: big }).expect(200);
    expect(res.body).toMatchObject({ created: 300, errors: [] });
    expect(Date.now() - started).toBeLessThan(20000);
    const cheapest = await request(t.app.getHttpServer()).get('/api/v1/models?organization=bulklab&sort=inputPrice&pageSize=1');
    expect(cheapest.body.data[0]).toMatchObject({ slug: 'model-0', pricing: { minInputPricePerMTok: 0.1 } });
    expect(cheapest.body.meta.total).toBe(300);
  });
});
