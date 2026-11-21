import type { ModelDetailView } from './model.presenter';

type Pick = 'min' | 'max';

/** Slugs of the model(s) holding the best value; null if nobody has a value. Ties return every winner. */
export function bestOf(models: ModelDetailView[], value: (m: ModelDetailView) => number | null, pick: Pick): string[] {
  const vals = models.map((m) => ({ slug: m.slug, v: value(m) })).filter((x): x is { slug: string; v: number } => x.v !== null);
  if (vals.length === 0) return [];
  const target = pick === 'min' ? Math.min(...vals.map((x) => x.v)) : Math.max(...vals.map((x) => x.v));
  return vals.filter((x) => x.v === target).map((x) => x.slug);
}

/**
 * Side-by-side comparison. Columns follow the caller's order; each comparable row
 * reports the per-model values plus which model(s) win on that row.
 */
export function buildComparison(models: ModelDetailView[]) {
  const slugs = models.map((m) => m.slug);

  // Union of all benchmarks any compared model has a result for.
  const benchMeta = new Map<string, ModelDetailView['benchmarks'][number]['benchmark']>();
  for (const m of models) for (const b of m.benchmarks) benchMeta.set(b.benchmark.slug, b.benchmark);

  const benchmarks = [...benchMeta.values()]
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    .map((meta) => {
      const scores: Record<string, number | null> = {};
      const normalized: Record<string, number | null> = {};
      for (const m of models) {
        const r = m.benchmarks.find((x) => x.benchmark.slug === meta.slug);
        scores[m.slug] = r ? r.score : null;
        normalized[m.slug] = r ? r.normalizedScore : null;
      }
      return {
        benchmark: meta,
        scores,
        normalizedScores: normalized,
        best: bestOf(models, (m) => normalized[m.slug], 'max'),
      };
    });

  const capMeta = new Map<string, { slug: string; name: string }>();
  for (const m of models) for (const c of m.capabilities) capMeta.set(c.slug, { slug: c.slug, name: c.name });
  const capabilities = [...capMeta.values()]
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((cap) => ({
      capability: cap,
      support: Object.fromEntries(models.map((m) => [m.slug, m.capabilities.some((c) => c.slug === cap.slug)])),
    }));

  const releaseTs = (m: ModelDetailView) => (m.releaseDate ? Date.parse(m.releaseDate) : null);

  return {
    models: slugs,
    items: models,
    highlights: {
      cheapestInput: bestOf(models, (m) => m.pricing.minInputPricePerMTok, 'min'),
      cheapestOutput: bestOf(models, (m) => m.pricing.minOutputPricePerMTok, 'min'),
      largestContext: bestOf(models, (m) => m.contextWindow, 'max'),
      largestMaxOutput: bestOf(models, (m) => m.maxOutputTokens, 'max'),
      mostProviders: bestOf(models, (m) => m.pricing.providerCount, 'max'),
      newest: bestOf(models, releaseTs, 'max'),
    },
    benchmarks,
    capabilities,
  };
}
