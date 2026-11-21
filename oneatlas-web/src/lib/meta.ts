import 'server-only';
import { cache } from 'react';
import { api } from './api';
import type { Meta, Option } from './types';

/** GET /meta, fetched at most once per request (React cache) and cached for 60s across requests (api.ts). */
export const getMeta = cache((): Promise<Meta> => api.meta());

const toMap = <T extends string>(opts: Option<T>[]) => Object.fromEntries(opts.map((o) => [o.value, o.label])) as Record<T, string>;

/** Display labels come from the API (single source of truth) — the frontend keeps no copies. */
export const getLabels = cache(async () => {
  const { enums } = await getMeta();
  return {
    modelType: toMap(enums.modelTypes),
    modelStatus: toMap(enums.modelStatuses),
    modality: toMap(enums.modalities),
    benchmarkCategory: toMap(enums.benchmarkCategories),
    organizationType: toMap(enums.organizationTypes),
    priceChange: toMap(enums.priceChanges),
  };
});

export type Labels = Awaited<ReturnType<typeof getLabels>>;
