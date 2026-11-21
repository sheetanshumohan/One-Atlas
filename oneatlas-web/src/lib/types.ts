// Response types mirroring the OneAtlas API (see oneatlas-api presenters).

export type ModelType =
  | 'CHAT' | 'REASONING' | 'CODE' | 'EMBEDDING' | 'IMAGE_GENERATION'
  | 'SPEECH_TO_TEXT' | 'TEXT_TO_SPEECH' | 'VIDEO_GENERATION' | 'MODERATION';
export type ModelStatus = 'PREVIEW' | 'ACTIVE' | 'DEPRECATED';
export type Modality = 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FILE' | 'EMBEDDING';
export type BenchmarkCategory =
  | 'GENERAL_KNOWLEDGE' | 'REASONING' | 'MATH' | 'CODING' | 'INSTRUCTION_FOLLOWING'
  | 'MULTIMODAL' | 'LONG_CONTEXT' | 'AGENTIC';
export type OrganizationType = 'AI_LAB' | 'BIG_TECH' | 'STARTUP' | 'RESEARCH_INSTITUTE' | 'OPEN_SOURCE_COLLECTIVE';

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface Pricing {
  minInputPricePerMTok: number | null;
  minOutputPricePerMTok: number | null;
  providerCount: number;
}

export interface ModelSummary {
  id: string;
  slug: string;
  name: string;
  type: ModelType;
  status: ModelStatus;
  organization: { slug: string; name: string };
  releaseDate: string | null;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  openWeights: boolean;
  inputModalities: Modality[];
  outputModalities: Modality[];
  capabilities: string[];
  pricing: Pricing;
}

export interface BenchmarkMeta {
  slug: string;
  name: string;
  category: BenchmarkCategory;
  unit: string;
  minScore: number;
  maxScore: number;
  higherIsBetter: boolean;
}

export interface Offering {
  provider: { slug: string; name: string; website: string | null };
  providerModelId: string;
  inputPricePerMTok: number;
  outputPricePerMTok: number;
  cachedInputPerMTok: number | null;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  avgLatencyMs: number | null;
  throughputTps: number | null;
  uptimePct: number | null;
  isAvailable: boolean;
}

export interface BenchmarkScore {
  benchmark: BenchmarkMeta;
  score: number;
  normalizedScore: number;
  sourceUrl: string | null;
  measuredAt: string | null;
}

export interface ModelDetail extends Omit<ModelSummary, 'capabilities' | 'organization'> {
  description: string | null;
  organization: { slug: string; name: string; type: OrganizationType; website: string | null };
  knowledgeCutoff: string | null;
  parameterCountB: number | null;
  license: string | null;
  capabilities: { slug: string; name: string; description: string | null }[];
  providers: Offering[];
  benchmarks: BenchmarkScore[];
}

export interface Comparison {
  models: string[];
  items: ModelDetail[];
  highlights: Record<'cheapestInput' | 'cheapestOutput' | 'largestContext' | 'largestMaxOutput' | 'mostProviders' | 'newest', string[]>;
  benchmarks: {
    benchmark: BenchmarkMeta;
    scores: Record<string, number | null>;
    normalizedScores: Record<string, number | null>;
    best: string[];
  }[];
  capabilities: { capability: { slug: string; name: string }; support: Record<string, boolean> }[];
}

export interface Organization {
  slug: string;
  name: string;
  type: OrganizationType;
  description: string | null;
  website: string | null;
  country: string | null;
  foundedYear: number | null;
  modelCount: number;
}
export interface OrganizationDetail extends Organization {
  stats: { modelCount: number; openWeightsModelCount: number; firstRelease: string | null; latestRelease: string | null };
  models: ModelSummary[];
}

export interface Provider {
  slug: string;
  name: string;
  description: string | null;
  website: string | null;
  apiBaseUrl: string | null;
  modelCount: number;
}
export interface ProviderDetail extends Provider {
  stats: { modelCount: number; organizations: string[] };
  models: {
    model: ModelSummary;
    providerModelId: string;
    inputPricePerMTok: number;
    outputPricePerMTok: number;
    cachedInputPerMTok: number | null;
    contextWindow: number | null;
    avgLatencyMs: number | null;
    throughputTps: number | null;
    uptimePct: number | null;
    isAvailable: boolean;
  }[];
}

export interface Benchmark extends BenchmarkMeta {
  description: string | null;
  url: string | null;
  resultCount: number;
}

export interface Capability {
  slug: string;
  name: string;
  description: string | null;
  modelCount: number;
}

export interface LeaderboardEntry {
  rank: number;
  model: { slug: string; name: string; type: ModelType | null; openWeights: boolean | null; organization: { slug: string; name: string } | null };
  score: number;
  benchmarksCovered: number;
  results: Record<string, { score: number; normalizedScore: number }>;
}
export interface Leaderboard extends Paginated<LeaderboardEntry> {
  scope: {
    kind: 'benchmark' | 'category' | 'overall';
    benchmark: string | null;
    category: BenchmarkCategory | null;
    benchmarks: { slug: string; name: string; category: BenchmarkCategory; higherIsBetter: boolean; unit: string }[];
  };
}

export interface SearchResults {
  query: string;
  total: number;
  models: ModelSummary[];
  organizations: { slug: string; name: string; type: OrganizationType }[];
  providers: { slug: string; name: string }[];
  benchmarks: { slug: string; name: string; category: BenchmarkCategory }[];
}

export interface Stats {
  totals: { models: number; organizations: number; providers: number; benchmarks: number; offerings: number; benchmarkResults: number; openWeightsModels: number };
  modelsByType: Partial<Record<ModelType, number>>;
}

export interface ApiErrorBody {
  statusCode: number;
  error: { code: string; message: string; details?: { field: string; messages: string[] }[] };
  requestId?: string;
}
