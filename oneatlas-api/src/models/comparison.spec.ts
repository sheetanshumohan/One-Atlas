import { bestOf, buildComparison } from './comparison';
import type { ModelDetailView } from './model.presenter';

function model(slug: string, over: Partial<ModelDetailView> = {}): ModelDetailView {
  return {
    id: slug, slug, name: slug, description: null, type: 'CHAT', status: 'ACTIVE',
    organization: { slug: 'o', name: 'O', type: 'AI_LAB', website: null },
    releaseDate: null, knowledgeCutoff: null, contextWindow: null, maxOutputTokens: null, parameterCountB: null,
    openWeights: false, license: null, inputModalities: ['TEXT'], outputModalities: ['TEXT'], capabilities: [],
    pricing: { minInputPricePerMTok: null, minOutputPricePerMTok: null, providerCount: 0, currency: 'USD', unit: 'per_1m_tokens' },
    providers: [], benchmarks: [], createdAt: '', updatedAt: '',
    ...over,
  } as ModelDetailView;
}

const bench = (slug: string, score: number, normalizedScore = score) => ({
  benchmark: { slug, name: slug.toUpperCase(), category: 'CODING' as const, unit: '%', minScore: 0, maxScore: 100, higherIsBetter: true },
  score, normalizedScore, sourceUrl: null, measuredAt: null,
});

describe('bestOf', () => {
  const ms = [model('a', { contextWindow: 100 }), model('b', { contextWindow: 300 }), model('c', { contextWindow: 300 }), model('d')];
  it('returns every winner on ties and ignores nulls', () => {
    expect(bestOf(ms, (m) => m.contextWindow, 'max')).toEqual(['b', 'c']);
    expect(bestOf(ms, (m) => m.contextWindow, 'min')).toEqual(['a']);
  });
  it('returns [] when nobody has a value', () => {
    expect(bestOf([model('x'), model('y')], (m) => m.contextWindow, 'max')).toEqual([]);
  });
  it('treats 0 as a real value (free pricing wins)', () => {
    expect(bestOf([model('x', { contextWindow: 0 }), model('y', { contextWindow: 5 })], (m) => m.contextWindow, 'min')).toEqual(['x']);
  });
});

describe('buildComparison', () => {
  const a = model('a', {
    releaseDate: '2024-01-01', contextWindow: 128000,
    pricing: { minInputPricePerMTok: 1, minOutputPricePerMTok: 4, providerCount: 2, currency: 'USD', unit: 'per_1m_tokens' },
    capabilities: [{ slug: 'vision', name: 'Vision', description: null }],
    benchmarks: [bench('humaneval', 90), bench('mmlu', 70)],
  });
  const b = model('b', {
    releaseDate: '2025-01-01', contextWindow: 200000,
    pricing: { minInputPricePerMTok: 3, minOutputPricePerMTok: 2, providerCount: 1, currency: 'USD', unit: 'per_1m_tokens' },
    capabilities: [{ slug: 'tool-calling', name: 'Tools', description: null }],
    benchmarks: [bench('humaneval', 95)],
  });

  const cmp = buildComparison([b, a]);

  it('preserves the requested column order', () => {
    expect(cmp.models).toEqual(['b', 'a']);
    expect(cmp.items.map((m) => m.slug)).toEqual(['b', 'a']);
  });

  it('computes highlights per dimension (input and output cheapest can differ)', () => {
    expect(cmp.highlights).toEqual({
      cheapestInput: ['a'], cheapestOutput: ['b'], largestContext: ['b'], largestMaxOutput: [], mostProviders: ['a'], newest: ['b'],
    });
  });

  it('unions benchmarks, fills missing scores with null and picks the best', () => {
    const he = cmp.benchmarks.find((x) => x.benchmark.slug === 'humaneval')!;
    expect(he.scores).toEqual({ b: 95, a: 90 });
    expect(he.best).toEqual(['b']);
    const mmlu = cmp.benchmarks.find((x) => x.benchmark.slug === 'mmlu')!;
    expect(mmlu.scores).toEqual({ b: null, a: 70 });
    expect(mmlu.best).toEqual(['a']);
  });

  it('builds a capability support matrix', () => {
    expect(cmp.capabilities).toEqual([
      { capability: { slug: 'tool-calling', name: 'Tools' }, support: { b: true, a: false } },
      { capability: { slug: 'vision', name: 'Vision' }, support: { b: false, a: true } },
    ]);
  });
});
