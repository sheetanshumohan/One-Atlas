import { Prisma } from '@prisma/client';
import { containsInsensitive } from '../common/utils/search';
import { validationError } from '../common/errors';
import { DEFAULT_ORDER, ListModelsQueryDto, ModelSortField } from './dto/list-models.query';

/** Pure translation of validated query params into a Prisma filter — unit-tested in isolation. */
export function buildModelWhere(q: Partial<ListModelsQueryDto>): Prisma.ModelWhereInput {
  if (q.minContext !== undefined && q.maxContext !== undefined && q.minContext > q.maxContext) {
    throw validationError('minContext', 'minContext must be less than or equal to maxContext');
  }
  if (q.releasedAfter && q.releasedBefore && q.releasedAfter > q.releasedBefore) {
    throw validationError('releasedAfter', 'releasedAfter must be on or before releasedBefore');
  }

  const and: Prisma.ModelWhereInput[] = [];

  if (q.q) {
    const contains = containsInsensitive(q.q);
    and.push({
      OR: [{ name: contains }, { slug: contains }, { description: contains }, { organization: { name: contains } }],
    });
  }
  if (q.organization?.length) and.push({ organization: { slug: { in: q.organization } } });
  if (q.provider?.length) {
    and.push({ offerings: { some: { isAvailable: true, provider: { slug: { in: q.provider } } } } });
  }
  for (const cap of q.capability ?? []) {
    and.push({ capabilities: { some: { capability: { slug: cap } } } });
  }
  if (q.type?.length) and.push({ type: { in: q.type } });
  if (q.status?.length) and.push({ status: { in: q.status } });
  if (q.inputModality?.length) and.push({ inputModalities: { hasEvery: q.inputModality } });
  if (q.outputModality?.length) and.push({ outputModalities: { hasEvery: q.outputModality } });
  if (q.openWeights !== undefined) and.push({ openWeights: q.openWeights });
  if (q.minContext !== undefined || q.maxContext !== undefined) {
    and.push({ contextWindow: { gte: q.minContext, lte: q.maxContext } });
  }
  if (q.maxInputPrice !== undefined) and.push({ minInputPrice: { lte: q.maxInputPrice } });
  if (q.maxOutputPrice !== undefined) and.push({ minOutputPrice: { lte: q.maxOutputPrice } });
  if (q.releasedAfter || q.releasedBefore) {
    and.push({
      releaseDate: {
        gte: q.releasedAfter ? new Date(q.releasedAfter) : undefined,
        lte: q.releasedBefore ? new Date(q.releasedBefore) : undefined,
      },
    });
  }

  return and.length ? { AND: and } : {};
}

const SORT_COLUMN: Record<ModelSortField, keyof Prisma.ModelOrderByWithRelationInput> = {
  releaseDate: 'releaseDate',
  name: 'nameSortKey', // case-insensitive (generated lower(name) column)
  contextWindow: 'contextWindow',
  inputPrice: 'minInputPrice',
  outputPrice: 'minOutputPrice',
  providerCount: 'providerCount',
  createdAt: 'createdAt',
};

const NULLABLE_SORTS = new Set<ModelSortField>(['releaseDate', 'contextWindow', 'inputPrice', 'outputPrice']);

/**
 * Unknown values (no price, no release date) always sort LAST regardless of direction,
 * and `slug` is a unique tie-breaker so pagination is deterministic (no duplicates/skips across pages).
 */
export function buildModelOrderBy(sort: ModelSortField = 'releaseDate', order?: 'asc' | 'desc'): Prisma.ModelOrderByWithRelationInput[] {
  const direction = order ?? DEFAULT_ORDER[sort];
  const column = SORT_COLUMN[sort];
  const primary: Prisma.ModelOrderByWithRelationInput = NULLABLE_SORTS.has(sort)
    ? { [column]: { sort: direction, nulls: 'last' } }
    : { [column]: direction };
  return sort === 'name' ? [primary, { slug: 'asc' }] : [primary, { nameSortKey: 'asc' }, { slug: 'asc' }];
}
