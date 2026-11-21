import 'server-only';
import type {
  Benchmark, Capability, Comparison, Leaderboard, ModelDetail, ModelSummary, Organization, OrganizationDetail,
  Paginated, Provider, ProviderDetail, SearchResults, Stats, ApiErrorBody,
} from './types';

/**
 * Server-side API client. Pages are React Server Components, so the browser never talks to the API
 * directly: no CORS, the API URL can stay private, and every page is server-rendered with real data.
 */
const API_URL = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
/** Identifies this server to the API so all visitors don't share one per-IP rate-limit bucket. */
const CLIENT_KEY = process.env.API_CLIENT_KEY;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: ApiErrorBody['error']['details'],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | boolean | string[] | undefined | null>;

export function toQueryString(params: Query = {}): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) qs.set(key, value.join(','));
    } else qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

async function request<T>(path: string, params?: Query): Promise<T> {
  const url = `${API_URL}/api/v1${path}${toQueryString(params)}`;
  let res: Response;
  try {
    // Catalogue data changes rarely; cache for 60s and let Next revalidate in the background.
    res = await fetch(url, { next: { revalidate: 60 }, headers: { Accept: 'application/json', ...(CLIENT_KEY ? { 'x-client-key': CLIENT_KEY } : {}) } });
  } catch {
    throw new ApiError(503, 'API_UNREACHABLE', 'The OneAtlas API is unreachable. Please try again shortly.');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(res.status, body?.error.code ?? 'HTTP_ERROR', body?.error.message ?? res.statusText, body?.error.details);
  }
  return (await res.json()) as T;
}

/** Returns null on 404 so pages can call notFound(); other errors propagate to error.tsx. */
async function orNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export const api = {
  models: (params: Query) => request<Paginated<ModelSummary>>('/models', params),
  model: (slug: string) => orNull(request<ModelDetail>(`/models/${encodeURIComponent(slug)}`)),
  compare: (slugs: string[]) => request<Comparison>('/models/compare', { models: slugs }),
  organizations: (params: Query = {}) => request<Paginated<Organization>>('/organizations', params),
  organization: (slug: string) => orNull(request<OrganizationDetail>(`/organizations/${encodeURIComponent(slug)}`)),
  providers: (params: Query = {}) => request<Paginated<Provider>>('/providers', params),
  provider: (slug: string) => orNull(request<ProviderDetail>(`/providers/${encodeURIComponent(slug)}`)),
  benchmarks: (params: Query = {}) => request<Paginated<Benchmark>>('/benchmarks', params),
  capabilities: () => request<{ data: Capability[] }>('/capabilities'),
  rankings: (params: Query) => request<Leaderboard>('/rankings', params),
  search: (q: string, limit = 8) => request<SearchResults>('/search', { q, limit }),
  stats: () => request<Stats>('/stats'),
};
