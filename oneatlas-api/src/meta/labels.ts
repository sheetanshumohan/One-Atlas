import { BenchmarkCategory, Modality, ModelStatus, ModelType, OrganizationType, PriceChange } from '@prisma/client';

/**
 * Human-readable labels for every enum the API exposes. The backend is the single source of truth:
 * clients render these from GET /meta instead of keeping their own copies.
 */
export const LABELS = {
  modelType: {
    CHAT: 'Chat', REASONING: 'Reasoning', CODE: 'Code', EMBEDDING: 'Embedding', IMAGE_GENERATION: 'Image generation',
    SPEECH_TO_TEXT: 'Speech to text', TEXT_TO_SPEECH: 'Text to speech', VIDEO_GENERATION: 'Video generation', MODERATION: 'Moderation',
  } satisfies Record<ModelType, string>,
  modelStatus: { PREVIEW: 'Preview', ACTIVE: 'Active', DEPRECATED: 'Deprecated' } satisfies Record<ModelStatus, string>,
  modality: { TEXT: 'Text', IMAGE: 'Image', AUDIO: 'Audio', VIDEO: 'Video', FILE: 'File', EMBEDDING: 'Embedding' } satisfies Record<Modality, string>,
  benchmarkCategory: {
    GENERAL_KNOWLEDGE: 'General knowledge', REASONING: 'Reasoning', MATH: 'Math', CODING: 'Coding',
    INSTRUCTION_FOLLOWING: 'Instruction following', MULTIMODAL: 'Multimodal', LONG_CONTEXT: 'Long context', AGENTIC: 'Agentic',
  } satisfies Record<BenchmarkCategory, string>,
  organizationType: {
    AI_LAB: 'AI lab', BIG_TECH: 'Big tech', STARTUP: 'Startup', RESEARCH_INSTITUTE: 'Research institute', OPEN_SOURCE_COLLECTIVE: 'Open-source collective',
  } satisfies Record<OrganizationType, string>,
  priceChange: { CREATED: 'Listed', UPDATED: 'Price changed', REMOVED: 'Delisted' } satisfies Record<PriceChange, string>,
};

export const enumOptions = <T extends string>(labels: Record<T, string>) =>
  (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));
