import type { BenchmarkCategory, Modality, ModelStatus, ModelType, OrganizationType } from './types';

/**
 * USD per 1M tokens, always at least 2 decimals so columns line up: "$2.50", "$0.10", "$0.15".
 * Sub-cent precision is kept only when it exists: "$0.075", "$0.0375". 0 → "Free", null → "—".
 */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (value === 0) return 'Free';
  if (value >= 1 || Number(value.toFixed(2)) === value) return `$${value.toFixed(2)}`;
  const precise = Number(value.toFixed(4)).toString(); // trims trailing zeros, max 4 dp
  const decimals = precise.split('.')[1]?.length ?? 0;
  return `$${value.toFixed(Math.max(2, decimals))}`;
}

/** 128000 → "128K", 1048576 → "1M", 2097152 → "2M", 8191 → "8K", null → "—". */
export function formatTokens(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (value >= 1_000_000) {
    const m = value / 1_048_576 >= 0.99 && value % 1_048_576 < 50_000 ? value / 1_048_576 : value / 1_000_000;
    return `${Number(m.toFixed(m >= 10 ? 0 : 1))}M`;
  }
  // Power-of-two sizes use the industry's binary naming: 32768 → "32K", 131072 → "128K"; others are decimal.
  // (exact powers of two only — 128000 is also divisible by 1024 but is a decimal "128K")
  if (value >= 1024 && Number.isInteger(Math.log2(value))) return `${value / 1024}K`;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return String(value);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2024-05-13" → "May 13, 2024". Parsed manually so server and client render identically (no TZ shifts). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return '—';
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

export function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return '—';
  return Number.isInteger(value) ? value.toLocaleString('en-US') : value.toFixed(digits);
}

export function formatParams(billions: number | null | undefined): string {
  if (billions === null || billions === undefined) return '—';
  return billions >= 1 ? `${formatNumber(billions)}B` : `${Math.round(billions * 1000)}M`;
}

function title(s: string): string {
  return s.toLowerCase().split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

export const MODEL_TYPE_LABEL: Record<ModelType, string> = {
  CHAT: 'Chat', REASONING: 'Reasoning', CODE: 'Code', EMBEDDING: 'Embedding', IMAGE_GENERATION: 'Image generation',
  SPEECH_TO_TEXT: 'Speech to text', TEXT_TO_SPEECH: 'Text to speech', VIDEO_GENERATION: 'Video generation', MODERATION: 'Moderation',
};
export const CATEGORY_LABEL: Record<BenchmarkCategory, string> = {
  GENERAL_KNOWLEDGE: 'General knowledge', REASONING: 'Reasoning', MATH: 'Math', CODING: 'Coding',
  INSTRUCTION_FOLLOWING: 'Instruction following', MULTIMODAL: 'Multimodal', LONG_CONTEXT: 'Long context', AGENTIC: 'Agentic',
};
export const ORG_TYPE_LABEL: Record<OrganizationType, string> = {
  AI_LAB: 'AI lab', BIG_TECH: 'Big tech', STARTUP: 'Startup', RESEARCH_INSTITUTE: 'Research institute', OPEN_SOURCE_COLLECTIVE: 'Open-source collective',
};
export const STATUS_LABEL: Record<ModelStatus, string> = { PREVIEW: 'Preview', ACTIVE: 'Active', DEPRECATED: 'Deprecated' };
export const modalityLabel = (m: Modality): string => title(m);

export function formatScore(score: number, unit: string): string {
  return unit === '%' ? `${formatNumber(score)}%` : `${formatNumber(score)} ${unit}`;
}
