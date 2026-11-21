#!/usr/bin/env node
/**
 * Read-only black-box verification of a DEPLOYED OneAtlas API.
 *
 *   API_URL=https://oneatlas-api.onrender.com node scripts/live-check.mjs
 *
 * Instead of hand-picked expected values, it checks properties that must hold for every item:
 * every sort is really sorted (unknowns last), pagination covers everything exactly once,
 * filters return only and all matching models, price summaries equal the provider rows,
 * leaderboard ranks match scores, and errors use the documented envelope.
 * It never writes, so it is safe to run against production. Exits non-zero on any failure.
 */
const API = (process.env.API_URL ?? 'https://oneatlas-api.onrender.com').replace(/\/$/, '');
const B = `${API}/api/v1`;
let pass = 0;
let fail = 0;
const check = (name, cond, info) => {
  if (cond) pass++;
  else {
    fail++;
    console.log('FAIL:', name, info === undefined ? '' : JSON.stringify(info));
  }
};

async function get(path) {
  const r = await fetch(B + path);
  return { status: r.status, headers: r.headers, body: await r.json().catch(() => null) };
}

async function all(path) {
  const out = [];
  for (let page = 1; ; page++) {
    const { body } = await get(`${path}${path.includes('?') ? '&' : '?'}pageSize=7&page=${page}`);
    out.push(...body.data);
    if (!body.meta.hasNextPage) return out;
  }
}

// Free Render instances sleep when idle; wait (up to ~3 min) for the cold start.
async function warmUp() {
  for (let i = 0; i < 36; i++) {
    try {
      const r = await fetch(`${B}/health`, { signal: AbortSignal.timeout(20_000) });
      if (r.ok) return;
    } catch {
      /* still waking up */
    }
    await new Promise((res) => setTimeout(res, 5000));
  }
  throw new Error(`API at ${API} did not become healthy`);
}

await warmUp();
console.log(`Checking ${API}`);

// 1. health, docs, headers
const health = await get('/health');
check('health ok', health.status === 200 && health.body.status === 'ok' && health.body.database === 'up', health.body);
check('X-Request-Id header', /^[0-9a-f-]{36}$/.test(health.headers.get('x-request-id') ?? ''));
check('swagger UI served', (await fetch(`${API}/docs`)).status === 200);
const spec = await (await fetch(`${API}/docs-json`)).json();
check('OpenAPI documents models/compare/rankings', ['/api/v1/models', '/api/v1/models/compare', '/api/v1/rankings'].every((p) => p in spec.paths));

// 2. sorting + pagination, every sort field and direction
const total = (await get('/models')).body.meta.total;
check('catalogue seeded', total >= 30, total);
const value = {
  releaseDate: (m) => m.releaseDate,
  name: (m) => m.name.toLowerCase(),
  contextWindow: (m) => m.contextWindow,
  inputPrice: (m) => m.pricing.minInputPricePerMTok,
  outputPrice: (m) => m.pricing.minOutputPricePerMTok,
  providerCount: (m) => m.pricing.providerCount,
};
for (const [sort, fn] of Object.entries(value)) {
  for (const order of ['asc', 'desc']) {
    const items = await all(`/models?sort=${sort}&order=${order}`);
    const slugs = items.map((m) => m.slug);
    check(`${sort}/${order}: pagination complete + unique`, slugs.length === total && new Set(slugs).size === total);
    const vals = items.map(fn);
    const firstNull = vals.indexOf(null);
    check(`${sort}/${order}: unknown values last`, firstNull === -1 || vals.slice(firstNull).every((v) => v === null));
    const known = vals.filter((v) => v !== null);
    // Names: the API guarantees case-insensitive code-point order (COLLATE "C"), identical on every server.
    const cmp = (a, b) => (typeof a === 'string' ? (a < b ? -1 : a > b ? 1 : 0) : a - b);
    check(`${sort}/${order}: sorted`, known.every((v, i) => i === 0 || (order === 'asc' ? cmp(known[i - 1], v) <= 0 : cmp(known[i - 1], v) >= 0)));
  }
}

// 3. every model detail is internally consistent
const models = await all('/models');
for (const m of models) {
  const { status, body: d } = await get(`/models/${m.slug}`);
  check(`detail ${m.slug}: 200`, status === 200);
  const avail = d.providers.filter((p) => p.isAvailable);
  const minIn = avail.length ? Math.min(...avail.map((p) => p.inputPricePerMTok)) : null;
  const minOut = avail.length ? Math.min(...avail.map((p) => p.outputPricePerMTok)) : null;
  check(`${m.slug}: price summary == cheapest provider`, d.pricing.minInputPricePerMTok === minIn && d.pricing.minOutputPricePerMTok === minOut && d.pricing.providerCount === avail.length);
  const ins = d.providers.map((p) => p.inputPricePerMTok);
  check(`${m.slug}: providers cheapest first`, ins.every((v, i) => i === 0 || ins[i - 1] <= v));
  check(`${m.slug}: maxOutput <= context`, d.maxOutputTokens == null || d.contextWindow == null || d.maxOutputTokens <= d.contextWindow);
  for (const b of d.benchmarks) {
    check(`${m.slug}/${b.benchmark.slug}: score in range, normalised 0-100`, b.score >= b.benchmark.minScore && b.score <= b.benchmark.maxScore && b.normalizedScore >= 0 && b.normalizedScore <= 100);
  }
}

// 4. filters return only and all matching models
const filters = [
  ['openWeights=true', (m) => m.openWeights === true],
  ['type=REASONING', (m) => m.type === 'REASONING'],
  ['capability=vision,tool-calling', (m) => m.capabilities.includes('vision') && m.capabilities.includes('tool-calling')],
  ['inputModality=IMAGE,AUDIO', (m) => m.inputModalities.includes('IMAGE') && m.inputModalities.includes('AUDIO')],
  ['minContext=1000000', (m) => m.contextWindow >= 1000000],
  ['maxInputPrice=0.5', (m) => m.pricing.minInputPricePerMTok !== null && m.pricing.minInputPricePerMTok <= 0.5],
  ['organization=meta,openai', (m) => ['meta', 'openai'].includes(m.organization.slug)],
  ['releasedAfter=2025-01-01', (m) => m.releaseDate !== null && m.releaseDate >= '2025-01-01'],
  ['status=DEPRECATED', (m) => m.status === 'DEPRECATED'],
];
for (const [qs, pred] of filters) {
  const items = await all(`/models?${qs}`);
  check(`filter ${qs}: non-empty`, items.length > 0);
  check(`filter ${qs}: only matches`, items.every(pred), items.filter((m) => !pred(m)).map((m) => m.slug));
  check(`filter ${qs}: all matches`, items.length === models.filter(pred).length);
}
const groq = (await get('/providers/groq')).body;
const onGroq = await all('/models?provider=groq');
check('provider filter == provider detail', onGroq.map((m) => m.slug).sort().join() === groq.models.filter((x) => x.isAvailable).map((x) => x.model.slug).sort().join());

// 5. directories agree with the catalogue
for (const o of await all('/organizations')) {
  check(`lab ${o.slug}: model count`, o.modelCount === models.filter((m) => m.organization.slug === o.slug).length);
}
for (const p of await all('/providers')) {
  const { body } = await get(`/providers/${p.slug}`);
  check(`provider ${p.slug}: detail count`, body.models.filter((x) => x.isAvailable).length === p.modelCount);
}

// 6. leaderboards: competition ranks consistent with scores for every scope
const benches = await all('/benchmarks');
const scopes = [...benches.map((b) => `benchmark=${b.slug}`), ...[...new Set(benches.map((b) => b.category))].map((c) => `category=${c}`), ''];
for (const sc of scopes) {
  const items = await all(`/rankings?${sc}`);
  const ok = items.every((e, i) => i === 0 || (items[i - 1].score > e.score && e.rank === i + 1) || (items[i - 1].score === e.score && e.rank === items[i - 1].rank));
  check(`rankings ${sc || 'overall'}: ranks consistent`, ok && (items.length === 0 || items[0].rank === 1));
}
const hall = (await get('/rankings?benchmark=hallucination-rate')).body.data;
check('lower-is-better ranks lowest raw score first', hall[0].results['hallucination-rate'].score === Math.min(...hall.map((e) => e.results['hallucination-rate'].score)));

// 7. compare & search
const cmp = (await get('/models/compare?models=gpt-4o,claude-3.5-sonnet,llama-3.3-70b-instruct')).body;
check('compare keeps order', cmp.models.join() === 'gpt-4o,claude-3.5-sonnet,llama-3.3-70b-instruct');
check('compare cheapest input', cmp.highlights.cheapestInput.join() === 'llama-3.3-70b-instruct', cmp.highlights);
check('search finds models', (await get('/search?q=llama')).body.models.length > 0);
check('stats match catalogue', (await get('/stats')).body.totals.models === total);

// 8a. GET /meta is the single source of truth for clients: every facet count must equal the
//     number of results of the matching /models filter, and options with no models must not appear.
const meta = (await get('/meta')).body;
check('meta: totalModels == catalogue size', meta.facets.totalModels === total);
const facetChecks = [
  ...meta.facets.modelTypes.map((f) => [`type=${f.value}`, f.count]),
  ...meta.facets.statuses.map((f) => [`status=${f.value}`, f.count]),
  ...meta.facets.organizations.map((f) => [`organization=${f.slug}`, f.count]),
  ...meta.facets.providers.map((f) => [`provider=${f.slug}`, f.count]),
  ...meta.facets.capabilities.map((f) => [`capability=${f.slug}`, f.count]),
  ...meta.facets.inputModalities.map((f) => [`inputModality=${f.value}`, f.count]),
  ...meta.facets.contextWindows.map((f) => [`minContext=${f.min}`, f.count]),
  ['openWeights=true', meta.facets.openWeights],
];
for (const [qs, count] of facetChecks) {
  check(`meta facet ${qs} count == /models total`, count > 0 && (await get(`/models?${qs}&pageSize=1`)).body.meta.total === count, { qs, count });
}
for (const p of meta.sortPresets) check(`meta sort preset ${p.sort}:${p.order} accepted`, (await get(`/models?sort=${p.sort}&order=${p.order}&pageSize=1`)).status === 200);

// 8b. Price history: for every model, the newest event per provider equals the provider's current price.
for (const m of models) {
  const d = (await get(`/models/${m.slug}`)).body;
  const h = (await get(`/models/${m.slug}/price-history?pageSize=100`)).body.data;
  for (const p of d.providers) {
    const latest = h.find((e) => e.provider.slug === p.provider.slug);
    check(`${m.slug}@${p.provider.slug}: latest history == current price`,
      latest && latest.change !== 'REMOVED' && latest.inputPricePerMTok === p.inputPricePerMTok && latest.outputPricePerMTok === p.outputPricePerMTok && latest.isAvailable === p.isAvailable,
      { latest, current: { in: p.inputPricePerMTok, out: p.outputPricePerMTok } });
  }
  const t = h.map((e) => Date.parse(e.recordedAt));
  check(`${m.slug}: history newest first`, t.every((v, i) => i === 0 || t[i - 1] >= v));
}

// 8. errors, validation and auth (no writes succeed: no key is sent)
const nf = await get('/models/definitely-not-a-model');
check('404 envelope', nf.status === 404 && nf.body.error.code === 'NOT_FOUND' && typeof nf.body.requestId === 'string');
const bad = await get('/models?pageSize=1000&sort=bogus');
check('400 validation envelope', bad.status === 400 && bad.body.error.code === 'VALIDATION_ERROR' && bad.body.error.details.length === 2);
const write = await fetch(`${B}/capabilities`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
check('writes need the admin key (401)', write.status === 401);
const wrongKey = await fetch(`${B}/capabilities`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': 'wrong' }, body: '{}' });
check('wrong admin key rejected (403)', wrongKey.status === 403);
check('wildcards in search are literal', (await get('/models?q=%25')).body.meta.total === 0);

console.log(`\nLIVE API CHECK: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
