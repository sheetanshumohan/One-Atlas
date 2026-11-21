import { BadRequestException } from '@nestjs/common';
import { buildModelOrderBy, buildModelWhere } from './model-query.builder';

describe('buildModelWhere', () => {
  it('returns an empty filter for no params', () => {
    expect(buildModelWhere({})).toEqual({});
  });

  it('builds escaped, case-insensitive text search across fields', () => {
    const w = buildModelWhere({ q: '50%' });
    const contains = { contains: '50\\%', mode: 'insensitive' };
    expect(w).toEqual({
      AND: [{ OR: [{ name: contains }, { slug: contains }, { description: contains }, { organization: { name: contains } }] }],
    });
  });

  it('capabilities are ALL-of (one clause per capability)', () => {
    const w = buildModelWhere({ capability: ['vision', 'tool-calling'] });
    expect(w.AND).toEqual([
      { capabilities: { some: { capability: { slug: 'vision' } } } },
      { capabilities: { some: { capability: { slug: 'tool-calling' } } } },
    ]);
  });

  it('provider filter only counts available offerings', () => {
    expect(buildModelWhere({ provider: ['groq'] }).AND).toEqual([{ offerings: { some: { isAvailable: true, provider: { slug: { in: ['groq'] } } } } }]);
  });

  it('modalities use hasEvery, enums use in', () => {
    expect(buildModelWhere({ inputModality: ['TEXT', 'IMAGE'], type: ['CHAT'] }).AND).toEqual([
      { type: { in: ['CHAT'] } },
      { inputModalities: { hasEvery: ['TEXT', 'IMAGE'] } },
    ]);
  });

  it('openWeights=false is a real filter (not dropped as falsy)', () => {
    expect(buildModelWhere({ openWeights: false }).AND).toEqual([{ openWeights: false }]);
  });

  it('range filters', () => {
    expect(buildModelWhere({ minContext: 1000, maxInputPrice: 0 }).AND).toEqual([
      { contextWindow: { gte: 1000, lte: undefined } },
      { minInputPrice: { lte: 0 } },
    ]);
    const d = buildModelWhere({ releasedAfter: '2024-01-01', releasedBefore: '2024-12-31' }).AND as Array<Record<string, { gte: Date; lte: Date }>>;
    expect(d[0].releaseDate.gte.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(d[0].releaseDate.lte.toISOString()).toBe('2024-12-31T00:00:00.000Z');
  });

  it('rejects inverted ranges', () => {
    expect(() => buildModelWhere({ minContext: 10, maxContext: 5 })).toThrow(BadRequestException);
    expect(() => buildModelWhere({ releasedAfter: '2025-01-01', releasedBefore: '2024-01-01' })).toThrow(BadRequestException);
    expect(() => buildModelWhere({ minContext: 5, maxContext: 5 })).not.toThrow();
  });
});

describe('buildModelOrderBy', () => {
  it('defaults to newest first with nulls last and a deterministic tie-breaker', () => {
    expect(buildModelOrderBy()).toEqual([{ releaseDate: { sort: 'desc', nulls: 'last' } }, { nameSortKey: 'asc' }, { slug: 'asc' }]);
  });
  it('price sorts default to cheapest first and keep unknown prices last', () => {
    expect(buildModelOrderBy('inputPrice')[0]).toEqual({ minInputPrice: { sort: 'asc', nulls: 'last' } });
    expect(buildModelOrderBy('outputPrice', 'desc')[0]).toEqual({ minOutputPrice: { sort: 'desc', nulls: 'last' } });
  });
  it('non-nullable sorts', () => {
    expect(buildModelOrderBy('name')).toEqual([{ nameSortKey: 'asc' }, { slug: 'asc' }]);
    expect(buildModelOrderBy('providerCount')[0]).toEqual({ providerCount: 'desc' });
  });
});
