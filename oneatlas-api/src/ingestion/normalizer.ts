import { Modality, ModelType, Prisma } from '@prisma/client';
import { isValidSlug, slugify } from '../common/utils/slug';

/**
 * Normalisation of raw catalogue records (OpenRouter `/api/v1/models` shape) into OneAtlas' canonical model.
 * Pure functions only — no I/O — so every rule here is unit-tested directly.
 *
 * Key conversions:
 *  - pricing: USD per *token* strings ("0.0000025") → USD per *1M tokens* exact decimals (2.5)
 *  - ids: "meta-llama/llama-3.1-70b-instruct" → org "meta", model slug "llama-3.1-70b-instruct"
 *  - modalities: "text+image->text" or explicit arrays → Modality enums
 *  - supported_parameters → normalised capability slugs
 */

export interface RawModelRecord {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  created?: unknown;
  context_length?: unknown;
  hugging_face_id?: unknown;
  architecture?: { modality?: unknown; input_modalities?: unknown; output_modalities?: unknown } | null;
  pricing?: { prompt?: unknown; completion?: unknown; input_cache_read?: unknown } | null;
  top_provider?: { context_length?: unknown; max_completion_tokens?: unknown } | null;
  supported_parameters?: unknown;
}

export interface NormalizedOffering {
  providerModelId: string;
  inputPricePerMTok: Prisma.Decimal;
  outputPricePerMTok: Prisma.Decimal;
  cachedInputPerMTok: Prisma.Decimal | null;
  contextWindow: number | null;
  maxOutputTokens: number | null;
}

export interface NormalizedModel {
  slug: string;
  name: string;
  organizationSlug: string;
  organizationName: string;
  description: string | null;
  type: ModelType;
  releaseDate: Date | null;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  inputModalities: Modality[];
  outputModalities: Modality[];
  capabilities: string[];
  /** null = source does not say (do not overwrite curated value). */
  openWeights: boolean | null;
  offering: NormalizedOffering;
}

export type NormalizeResult =
  | { ok: true; value: NormalizedModel }
  | { ok: false; kind: 'skipped' | 'invalid'; reason: string };

/** Vendor-prefix → canonical organization slug + display name. */
export const ORGANIZATION_ALIASES: Record<string, { slug: string; name: string }> = {
  openai: { slug: 'openai', name: 'OpenAI' },
  anthropic: { slug: 'anthropic', name: 'Anthropic' },
  google: { slug: 'google', name: 'Google DeepMind' },
  'meta-llama': { slug: 'meta', name: 'Meta' },
  meta: { slug: 'meta', name: 'Meta' },
  mistralai: { slug: 'mistral-ai', name: 'Mistral AI' },
  mistral: { slug: 'mistral-ai', name: 'Mistral AI' },
  'x-ai': { slug: 'xai', name: 'xAI' },
  xai: { slug: 'xai', name: 'xAI' },
  deepseek: { slug: 'deepseek', name: 'DeepSeek' },
  qwen: { slug: 'alibaba', name: 'Alibaba (Qwen)' },
  alibaba: { slug: 'alibaba', name: 'Alibaba (Qwen)' },
  cohere: { slug: 'cohere', name: 'Cohere' },
  amazon: { slug: 'amazon', name: 'Amazon' },
  microsoft: { slug: 'microsoft', name: 'Microsoft' },
  nvidia: { slug: 'nvidia', name: 'NVIDIA' },
};

/** supported_parameters → capability slug */
const PARAMETER_CAPABILITIES: Record<string, string> = {
  tools: 'tool-calling',
  tool_choice: 'tool-calling',
  response_format: 'json-mode',
  structured_outputs: 'structured-outputs',
  reasoning: 'reasoning',
  include_reasoning: 'reasoning',
  web_search_options: 'web-search',
};

export const CAPABILITY_NAMES: Record<string, string> = {
  'tool-calling': 'Tool calling',
  'json-mode': 'JSON mode',
  'structured-outputs': 'Structured outputs',
  reasoning: 'Reasoning',
  'web-search': 'Web search',
  vision: 'Vision (image input)',
  'audio-input': 'Audio input',
  streaming: 'Streaming',
  'fine-tuning': 'Fine-tuning',
  'prompt-caching': 'Prompt caching',
};

const MODALITY_MAP: Record<string, Modality> = {
  text: Modality.TEXT,
  image: Modality.IMAGE,
  audio: Modality.AUDIO,
  video: Modality.VIDEO,
  file: Modality.FILE,
  embedding: Modality.EMBEDDING,
  embeddings: Modality.EMBEDDING,
};

/** Above this per-1M price a value is almost certainly a unit error (e.g. already per-1M). */
export const MAX_SANE_PRICE_PER_MTOK = new Prisma.Decimal(10_000);
const PER_MILLION = new Prisma.Decimal(1_000_000);
const MIN_RELEASE_YEAR = 2015;

export function parseDecimal(value: unknown): Prisma.Decimal | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return new Prisma.Decimal(value);
  }
  if (typeof value === 'string' && /^\s*-?\d+(\.\d+)?([eE][-+]?\d+)?\s*$/.test(value)) {
    return new Prisma.Decimal(value.trim());
  }
  return null;
}

/** USD/token → USD/1M tokens, rounded to 6dp (exact decimal maths — no float drift). */
export function perTokenToPerMillion(value: unknown): Prisma.Decimal | null {
  const d = parseDecimal(value);
  return d === null ? null : d.mul(PER_MILLION).toDecimalPlaces(6);
}

export function positiveInt(value: unknown): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= 100_000_000 ? n : null;
}

export function parseReleaseDate(value: unknown, now: Date = new Date()): Date | null {
  let d: Date | null = null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Heuristic: values below 1e11 are seconds, otherwise milliseconds.
    d = new Date(value < 1e11 ? value * 1000 : value);
  } else if (typeof value === 'string' && value.trim() !== '') {
    d = new Date(value);
  }
  if (!d || Number.isNaN(d.getTime())) return null;
  const maxTs = now.getTime() + 365 * 24 * 3600 * 1000;
  if (d.getUTCFullYear() < MIN_RELEASE_YEAR || d.getTime() > maxTs) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function toModalities(list: unknown): Modality[] {
  if (!Array.isArray(list)) return [];
  const out = list
    .filter((x): x is string => typeof x === 'string')
    .map((x) => MODALITY_MAP[x.trim().toLowerCase()])
    .filter((x): x is Modality => x !== undefined);
  return [...new Set(out)];
}

export function parseModalities(arch: RawModelRecord['architecture']): { input: Modality[]; output: Modality[] } {
  let input = toModalities(arch?.input_modalities);
  let output = toModalities(arch?.output_modalities);
  if ((input.length === 0 || output.length === 0) && typeof arch?.modality === 'string' && arch.modality.includes('->')) {
    const [i, o] = arch.modality.split('->');
    if (input.length === 0) input = toModalities(i.split('+'));
    if (output.length === 0) output = toModalities(o.split('+'));
  }
  return { input, output };
}

export function deriveCapabilities(params: unknown, input: Modality[], cachedPrice: Prisma.Decimal | null): string[] {
  const caps = new Set<string>();
  if (Array.isArray(params)) {
    for (const p of params) if (typeof p === 'string' && PARAMETER_CAPABILITIES[p]) caps.add(PARAMETER_CAPABILITIES[p]);
  }
  if (input.includes(Modality.IMAGE)) caps.add('vision');
  if (input.includes(Modality.AUDIO)) caps.add('audio-input');
  if (cachedPrice !== null) caps.add('prompt-caching');
  return [...caps].sort();
}

export function inferModelType(slug: string, output: Modality[], capabilities: string[]): ModelType {
  if (output.includes(Modality.EMBEDDING)) return ModelType.EMBEDDING;
  if (output.includes(Modality.IMAGE) && !output.includes(Modality.TEXT)) return ModelType.IMAGE_GENERATION;
  if (output.includes(Modality.AUDIO) && !output.includes(Modality.TEXT)) return ModelType.TEXT_TO_SPEECH;
  if (capabilities.includes('reasoning')) return ModelType.REASONING;
  if (/(^|[-.])(coder|codestral|code)([-.]|$)/.test(slug)) return ModelType.CODE;
  return ModelType.CHAT;
}

export function cleanName(raw: string): string {
  // "OpenAI: GPT-4o" → "GPT-4o" (vendor prefix is redundant with organization)
  return raw.replace(/^[^:]{1,40}:\s+/, '').replace(/\s+/g, ' ').trim();
}

export function resolveOrganization(prefix: string): { slug: string; name: string } {
  const key = prefix.trim().toLowerCase();
  const alias = ORGANIZATION_ALIASES[key];
  if (alias) return alias;
  const slug = slugify(key);
  const name = key.split(/[-_]/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  return { slug, name: name || slug };
}

export function normalizeRecord(raw: unknown, now: Date = new Date()): NormalizeResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, kind: 'invalid', reason: 'record must be an object' };
  }
  const r = raw as RawModelRecord;

  if (typeof r.id !== 'string' || !r.id.includes('/')) {
    return { ok: false, kind: 'invalid', reason: 'id must be a string of the form "<organization>/<model>"' };
  }
  const providerModelId = r.id.trim();
  const [prefix, ...rest] = providerModelId.split('/');
  const modelPart = rest.join('/');
  if (modelPart.includes(':')) {
    return { ok: false, kind: 'skipped', reason: 'variant listing (e.g. ":free"); the base model is ingested separately' };
  }

  const org = resolveOrganization(prefix);
  const slug = slugify(modelPart);
  if (!isValidSlug(org.slug) || !isValidSlug(slug)) {
    return { ok: false, kind: 'invalid', reason: `cannot derive valid slugs from id "${providerModelId}"` };
  }

  const name = typeof r.name === 'string' && cleanName(r.name) ? cleanName(r.name).slice(0, 120) : modelPart;

  const promptRaw = r.pricing?.prompt;
  const completionRaw = r.pricing?.completion;
  if (promptRaw === undefined || completionRaw === undefined) {
    return { ok: false, kind: 'invalid', reason: 'pricing.prompt and pricing.completion are required' };
  }
  const input = perTokenToPerMillion(promptRaw);
  const output = perTokenToPerMillion(completionRaw);
  if (input === null || output === null) {
    return { ok: false, kind: 'invalid', reason: 'pricing values must be numeric' };
  }
  if (input.isNegative() || output.isNegative()) {
    return { ok: false, kind: 'skipped', reason: 'dynamic/variable pricing (negative sentinel) is not a fixed price' };
  }
  if (input.gt(MAX_SANE_PRICE_PER_MTOK) || output.gt(MAX_SANE_PRICE_PER_MTOK)) {
    return { ok: false, kind: 'invalid', reason: 'price exceeds sanity limit — likely already per-1M or wrong unit' };
  }
  let cached = r.pricing?.input_cache_read !== undefined ? perTokenToPerMillion(r.pricing.input_cache_read) : null;
  if (cached !== null && (cached.isNegative() || cached.gt(input))) cached = null; // inconsistent → drop, keep the record

  const { input: inMods, output: outMods } = parseModalities(r.architecture ?? null);
  const inputModalities = inMods.length ? inMods : [Modality.TEXT];
  const outputModalities = outMods.length ? outMods : [Modality.TEXT];

  const contextWindow = positiveInt(r.context_length) ?? positiveInt(r.top_provider?.context_length);
  let maxOutputTokens = positiveInt(r.top_provider?.max_completion_tokens);
  if (contextWindow !== null && maxOutputTokens !== null && maxOutputTokens > contextWindow) maxOutputTokens = null;

  const capabilities = deriveCapabilities(r.supported_parameters, inputModalities, cached);
  const description = typeof r.description === 'string' && r.description.trim() ? r.description.trim().slice(0, 5000) : null;
  const hf = typeof r.hugging_face_id === 'string' && r.hugging_face_id.trim() !== '';

  return {
    ok: true,
    value: {
      slug,
      name,
      organizationSlug: org.slug,
      organizationName: org.name,
      description,
      type: inferModelType(slug, outputModalities, capabilities),
      releaseDate: parseReleaseDate(r.created, now),
      contextWindow,
      maxOutputTokens,
      inputModalities,
      outputModalities,
      capabilities,
      openWeights: hf ? true : null,
      offering: {
        providerModelId,
        inputPricePerMTok: input,
        outputPricePerMTok: output,
        cachedInputPerMTok: cached,
        contextWindow,
        maxOutputTokens,
      },
    },
  };
}
