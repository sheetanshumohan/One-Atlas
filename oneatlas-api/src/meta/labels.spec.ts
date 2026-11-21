import { BenchmarkCategory, Modality, ModelStatus, ModelType, OrganizationType, PriceChange } from '@prisma/client';
import { enumOptions, LABELS } from './labels';

describe('LABELS (single source of truth for display names)', () => {
  it.each([
    ['modelType', ModelType],
    ['modelStatus', ModelStatus],
    ['modality', Modality],
    ['benchmarkCategory', BenchmarkCategory],
    ['organizationType', OrganizationType],
    ['priceChange', PriceChange],
  ] as const)('%s has a non-empty label for every database enum value, and nothing extra', (key, dbEnum) => {
    const labels = LABELS[key] as Record<string, string>;
    expect(Object.keys(labels).sort()).toEqual(Object.values(dbEnum).sort());
    for (const v of Object.values(labels)) expect(v.trim().length).toBeGreaterThan(0);
  });

  it('enumOptions keeps declaration order and shape', () => {
    expect(enumOptions({ A: 'a', B: 'b' })).toEqual([{ value: 'A', label: 'a' }, { value: 'B', label: 'b' }]);
  });
});
