/**
 * Curated seed catalogue for OneAtlas.
 * Prices are an illustrative snapshot of public list prices (USD / 1M tokens) and benchmark scores are
 * approximate published figures — good enough for a realistic demo, not an authoritative source.
 */
import { BenchmarkCategory, Modality, ModelStatus, ModelType, OrganizationType } from '@prisma/client';

const { TEXT, IMAGE, AUDIO, VIDEO, FILE, EMBEDDING } = Modality;

export const organizations = [
  { slug: 'openai', name: 'OpenAI', type: OrganizationType.AI_LAB, country: 'US', foundedYear: 2015, website: 'https://openai.com', description: 'Creator of the GPT and o-series models.' },
  { slug: 'anthropic', name: 'Anthropic', type: OrganizationType.AI_LAB, country: 'US', foundedYear: 2021, website: 'https://www.anthropic.com', description: 'AI safety company building the Claude model family.' },
  { slug: 'google', name: 'Google DeepMind', type: OrganizationType.BIG_TECH, country: 'GB', foundedYear: 2010, website: 'https://deepmind.google', description: 'Google\'s AI research lab behind Gemini and Gemma.' },
  { slug: 'meta', name: 'Meta', type: OrganizationType.BIG_TECH, country: 'US', foundedYear: 2004, website: 'https://ai.meta.com', description: 'Publisher of the open-weights Llama family.' },
  { slug: 'mistral-ai', name: 'Mistral AI', type: OrganizationType.STARTUP, country: 'FR', foundedYear: 2023, website: 'https://mistral.ai', description: 'European lab shipping open and commercial models.' },
  { slug: 'xai', name: 'xAI', type: OrganizationType.AI_LAB, country: 'US', foundedYear: 2023, website: 'https://x.ai', description: 'Developer of the Grok models.' },
  { slug: 'deepseek', name: 'DeepSeek', type: OrganizationType.AI_LAB, country: 'CN', foundedYear: 2023, website: 'https://www.deepseek.com', description: 'Research lab known for efficient open MoE models.' },
  { slug: 'alibaba', name: 'Alibaba (Qwen)', type: OrganizationType.BIG_TECH, country: 'CN', foundedYear: 1999, website: 'https://qwenlm.github.io', description: 'Alibaba Cloud\'s Qwen model family.' },
  { slug: 'cohere', name: 'Cohere', type: OrganizationType.STARTUP, country: 'CA', foundedYear: 2019, website: 'https://cohere.com', description: 'Enterprise-focused LLMs, embeddings and rerankers.' },
  { slug: 'amazon', name: 'Amazon', type: OrganizationType.BIG_TECH, country: 'US', foundedYear: 1994, website: 'https://aws.amazon.com/ai/generative-ai/nova/', description: 'Amazon Nova foundation models.' },
  { slug: 'microsoft', name: 'Microsoft', type: OrganizationType.BIG_TECH, country: 'US', foundedYear: 1975, website: 'https://azure.microsoft.com/en-us/products/phi', description: 'Small language models (Phi).' },
  { slug: 'nvidia', name: 'NVIDIA', type: OrganizationType.BIG_TECH, country: 'US', foundedYear: 1993, website: 'https://www.nvidia.com/en-us/ai/', description: 'Nemotron fine-tunes and model tooling.' },
];

export const providers = [
  { slug: 'openai-api', name: 'OpenAI Platform', website: 'https://platform.openai.com', apiBaseUrl: 'https://api.openai.com/v1', description: 'First-party OpenAI API.' },
  { slug: 'anthropic-api', name: 'Anthropic API', website: 'https://console.anthropic.com', apiBaseUrl: 'https://api.anthropic.com/v1', description: 'First-party Claude API.' },
  { slug: 'google-ai-studio', name: 'Google AI Studio', website: 'https://aistudio.google.com', apiBaseUrl: 'https://generativelanguage.googleapis.com', description: 'Gemini API for developers.' },
  { slug: 'google-vertex-ai', name: 'Google Vertex AI', website: 'https://cloud.google.com/vertex-ai', description: 'Google Cloud managed model platform.' },
  { slug: 'aws-bedrock', name: 'Amazon Bedrock', website: 'https://aws.amazon.com/bedrock', description: 'AWS managed foundation-model service.' },
  { slug: 'azure-ai', name: 'Azure AI Foundry', website: 'https://ai.azure.com', description: 'Microsoft Azure model catalogue incl. Azure OpenAI.' },
  { slug: 'together-ai', name: 'Together AI', website: 'https://www.together.ai', apiBaseUrl: 'https://api.together.xyz/v1', description: 'Open-model inference cloud.' },
  { slug: 'groq', name: 'Groq', website: 'https://groq.com', apiBaseUrl: 'https://api.groq.com/openai/v1', description: 'LPU-based ultra-low-latency inference.' },
  { slug: 'fireworks-ai', name: 'Fireworks AI', website: 'https://fireworks.ai', apiBaseUrl: 'https://api.fireworks.ai/inference/v1', description: 'Fast open-model inference and fine-tuning.' },
  { slug: 'deepinfra', name: 'DeepInfra', website: 'https://deepinfra.com', apiBaseUrl: 'https://api.deepinfra.com/v1/openai', description: 'Low-cost serverless inference.' },
  { slug: 'mistral-api', name: 'Mistral La Plateforme', website: 'https://console.mistral.ai', apiBaseUrl: 'https://api.mistral.ai/v1', description: 'First-party Mistral API.' },
  { slug: 'deepseek-api', name: 'DeepSeek Platform', website: 'https://platform.deepseek.com', apiBaseUrl: 'https://api.deepseek.com', description: 'First-party DeepSeek API.' },
  { slug: 'xai-api', name: 'xAI API', website: 'https://console.x.ai', apiBaseUrl: 'https://api.x.ai/v1', description: 'First-party Grok API.' },
  { slug: 'openrouter', name: 'OpenRouter', website: 'https://openrouter.ai', apiBaseUrl: 'https://openrouter.ai/api/v1', description: 'Unified API router across many providers.' },
];

export const capabilities = [
  { slug: 'tool-calling', name: 'Tool calling', description: 'Function / tool calling with structured arguments.' },
  { slug: 'json-mode', name: 'JSON mode', description: 'Guaranteed syntactically valid JSON output.' },
  { slug: 'structured-outputs', name: 'Structured outputs', description: 'Output constrained to a supplied JSON schema.' },
  { slug: 'reasoning', name: 'Reasoning', description: 'Extended chain-of-thought / thinking mode.' },
  { slug: 'web-search', name: 'Web search', description: 'Built-in web search grounding.' },
  { slug: 'vision', name: 'Vision (image input)', description: 'Accepts images as input.' },
  { slug: 'audio-input', name: 'Audio input', description: 'Accepts audio as input.' },
  { slug: 'streaming', name: 'Streaming', description: 'Token streaming responses.' },
  { slug: 'fine-tuning', name: 'Fine-tuning', description: 'Supports custom fine-tuning.' },
  { slug: 'prompt-caching', name: 'Prompt caching', description: 'Discounted cached input tokens.' },
];

export const benchmarks = [
  { slug: 'mmlu-pro', name: 'MMLU-Pro', category: BenchmarkCategory.GENERAL_KNOWLEDGE, description: 'Harder, 10-choice successor to MMLU across 14 domains.', url: 'https://arxiv.org/abs/2406.01574' },
  { slug: 'lmarena-elo', name: 'LMArena Elo', category: BenchmarkCategory.GENERAL_KNOWLEDGE, unit: 'elo', minScore: 800, maxScore: 1600, description: 'Crowd-sourced pairwise human preference rating.', url: 'https://lmarena.ai' },
  { slug: 'gpqa-diamond', name: 'GPQA Diamond', category: BenchmarkCategory.REASONING, description: 'Graduate-level, Google-proof science Q&A.', url: 'https://arxiv.org/abs/2311.12022' },
  { slug: 'math-500', name: 'MATH-500', category: BenchmarkCategory.MATH, description: 'Competition mathematics subset.', url: 'https://arxiv.org/abs/2103.03874' },
  { slug: 'aime-2024', name: 'AIME 2024', category: BenchmarkCategory.MATH, description: 'American Invitational Mathematics Examination (pass@1).' },
  { slug: 'humaneval', name: 'HumanEval', category: BenchmarkCategory.CODING, description: 'Python function synthesis (pass@1).', url: 'https://arxiv.org/abs/2107.03374' },
  { slug: 'swe-bench-verified', name: 'SWE-bench Verified', category: BenchmarkCategory.AGENTIC, description: 'Resolving real GitHub issues end-to-end.', url: 'https://www.swebench.com' },
  { slug: 'livecodebench', name: 'LiveCodeBench', category: BenchmarkCategory.CODING, description: 'Contamination-free competitive programming problems.' },
  { slug: 'ifeval', name: 'IFEval', category: BenchmarkCategory.INSTRUCTION_FOLLOWING, description: 'Verifiable instruction-following.' },
  { slug: 'mmmu', name: 'MMMU', category: BenchmarkCategory.MULTIMODAL, description: 'Massive multi-discipline multimodal understanding.' },
  { slug: 'hallucination-rate', name: 'Hallucination Rate', category: BenchmarkCategory.LONG_CONTEXT, higherIsBetter: false, description: 'Share of summaries containing unsupported claims (lower is better).' },
];

type Offer = [provider: string, providerModelId: string, input: number, output: number, extra?: { cached?: number; latency?: number; tps?: number; uptime?: number; available?: boolean }];

export interface SeedModel {
  slug: string;
  name: string;
  org: string;
  type: ModelType;
  status?: ModelStatus;
  release: string | null;
  ctx: number | null;
  maxOut?: number;
  params?: number;
  open?: boolean;
  license?: string;
  cutoff?: string;
  input: Modality[];
  output: Modality[];
  caps: string[];
  description: string;
  offers: Offer[];
  scores: Record<string, number>;
}

const CHAT_CAPS = ['tool-calling', 'json-mode', 'streaming'];

export const models: SeedModel[] = [
  // ---------------- OpenAI
  { slug: 'gpt-4o', name: 'GPT-4o', org: 'openai', type: ModelType.CHAT, release: '2024-05-13', ctx: 128000, maxOut: 16384, license: 'Proprietary', cutoff: '2023-10-01', input: [TEXT, IMAGE, AUDIO], output: [TEXT, AUDIO], caps: [...CHAT_CAPS, 'structured-outputs', 'vision', 'audio-input', 'fine-tuning', 'prompt-caching'], description: 'OpenAI\'s flagship omni-modal model.',
    offers: [['openai-api', 'gpt-4o', 2.5, 10, { cached: 1.25, latency: 450, tps: 95, uptime: 99.9 }], ['azure-ai', 'gpt-4o', 2.5, 10, { cached: 1.25, latency: 520, tps: 80, uptime: 99.95 }], ['openrouter', 'openai/gpt-4o', 2.5, 10, { latency: 600, tps: 90, uptime: 99.7 }]],
    scores: { 'mmlu-pro': 72.6, 'gpqa-diamond': 53.6, 'math-500': 76.6, humaneval: 90.2, 'swe-bench-verified': 33.2, ifeval: 84.3, mmmu: 69.1, 'lmarena-elo': 1285, 'hallucination-rate': 1.5, livecodebench: 33.4 } },
  { slug: 'gpt-4o-mini', name: 'GPT-4o mini', org: 'openai', type: ModelType.CHAT, release: '2024-07-18', ctx: 128000, maxOut: 16384, license: 'Proprietary', cutoff: '2023-10-01', input: [TEXT, IMAGE], output: [TEXT], caps: [...CHAT_CAPS, 'structured-outputs', 'vision', 'fine-tuning', 'prompt-caching'], description: 'Small, fast and cheap GPT-4o variant.',
    offers: [['openai-api', 'gpt-4o-mini', 0.15, 0.6, { cached: 0.075, latency: 350, tps: 110, uptime: 99.9 }], ['azure-ai', 'gpt-4o-mini', 0.165, 0.66, { latency: 400, tps: 100 }], ['openrouter', 'openai/gpt-4o-mini', 0.15, 0.6]],
    scores: { 'mmlu-pro': 63.1, 'gpqa-diamond': 40.2, 'math-500': 70.2, humaneval: 87.2, ifeval: 80.4, mmmu: 59.4, 'lmarena-elo': 1272, 'hallucination-rate': 1.7 } },
  { slug: 'o1', name: 'o1', org: 'openai', type: ModelType.REASONING, release: '2024-12-05', ctx: 200000, maxOut: 100000, license: 'Proprietary', cutoff: '2023-10-01', input: [TEXT, IMAGE], output: [TEXT], caps: ['tool-calling', 'structured-outputs', 'reasoning', 'vision', 'streaming', 'prompt-caching'], description: 'Reasoning model that thinks before answering.',
    offers: [['openai-api', 'o1', 15, 60, { cached: 7.5, latency: 9000, tps: 60 }], ['azure-ai', 'o1', 15, 60], ['openrouter', 'openai/o1', 15, 60]],
    scores: { 'mmlu-pro': 89.3, 'gpqa-diamond': 78.0, 'math-500': 96.4, 'aime-2024': 79.2, 'swe-bench-verified': 48.9, livecodebench: 63.4, mmmu: 78.2, 'lmarena-elo': 1350 } },
  { slug: 'o3-mini', name: 'o3-mini', org: 'openai', type: ModelType.REASONING, release: '2025-01-31', ctx: 200000, maxOut: 100000, license: 'Proprietary', cutoff: '2023-10-01', input: [TEXT], output: [TEXT], caps: ['tool-calling', 'structured-outputs', 'reasoning', 'streaming', 'prompt-caching'], description: 'Cost-efficient reasoning model strong at STEM and code.',
    offers: [['openai-api', 'o3-mini', 1.1, 4.4, { cached: 0.55, latency: 4000, tps: 150 }], ['openrouter', 'openai/o3-mini', 1.1, 4.4]],
    scores: { 'gpqa-diamond': 79.7, 'math-500': 97.9, 'aime-2024': 87.3, 'swe-bench-verified': 49.3, livecodebench: 65.9, 'lmarena-elo': 1305 } },
  { slug: 'gpt-4.1', name: 'GPT-4.1', org: 'openai', type: ModelType.CHAT, release: '2025-04-14', ctx: 1047576, maxOut: 32768, license: 'Proprietary', cutoff: '2024-06-01', input: [TEXT, IMAGE], output: [TEXT], caps: [...CHAT_CAPS, 'structured-outputs', 'vision', 'fine-tuning', 'prompt-caching'], description: 'Long-context (1M) model tuned for coding and instruction following.',
    offers: [['openai-api', 'gpt-4.1', 2, 8, { cached: 0.5, latency: 500, tps: 100 }], ['azure-ai', 'gpt-4.1', 2, 8], ['openrouter', 'openai/gpt-4.1', 2, 8]],
    scores: { 'mmlu-pro': 80.1, 'gpqa-diamond': 66.3, 'swe-bench-verified': 54.6, ifeval: 87.4, mmmu: 74.8, 'lmarena-elo': 1360 } },
  { slug: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', org: 'openai', type: ModelType.CHAT, status: ModelStatus.DEPRECATED, release: '2023-03-01', ctx: 16385, maxOut: 4096, license: 'Proprietary', cutoff: '2021-09-01', input: [TEXT], output: [TEXT], caps: [...CHAT_CAPS, 'fine-tuning'], description: 'Legacy chat model, superseded by GPT-4o mini.',
    offers: [['openai-api', 'gpt-3.5-turbo', 0.5, 1.5]],
    scores: { 'mmlu-pro': 38.0, humaneval: 68.0, 'lmarena-elo': 1106 } },
  { slug: 'text-embedding-3-large', name: 'text-embedding-3-large', org: 'openai', type: ModelType.EMBEDDING, release: '2024-01-25', ctx: 8191, license: 'Proprietary', input: [TEXT], output: [EMBEDDING], caps: [], description: '3072-dimension embedding model.',
    offers: [['openai-api', 'text-embedding-3-large', 0.13, 0], ['azure-ai', 'text-embedding-3-large', 0.13, 0]], scores: {} },
  { slug: 'whisper-1', name: 'Whisper', org: 'openai', type: ModelType.SPEECH_TO_TEXT, release: '2022-09-21', ctx: null, open: true, license: 'MIT', params: 1.55, input: [AUDIO], output: [TEXT], caps: [], description: 'Speech recognition model (priced per audio minute, so no token pricing listed).', offers: [], scores: {} },

  // ---------------- Anthropic
  { slug: 'claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', org: 'anthropic', type: ModelType.CHAT, release: '2025-02-24', ctx: 200000, maxOut: 64000, license: 'Proprietary', cutoff: '2024-10-01', input: [TEXT, IMAGE, FILE], output: [TEXT], caps: [...CHAT_CAPS, 'reasoning', 'vision', 'prompt-caching'], description: 'Hybrid model with optional extended thinking.',
    offers: [['anthropic-api', 'claude-3-7-sonnet-20250219', 3, 15, { cached: 0.3, latency: 900, tps: 75, uptime: 99.8 }], ['aws-bedrock', 'anthropic.claude-3-7-sonnet-20250219-v1:0', 3, 15, { latency: 1000, tps: 65 }], ['google-vertex-ai', 'claude-3-7-sonnet@20250219', 3, 15], ['openrouter', 'anthropic/claude-3.7-sonnet', 3, 15]],
    scores: { 'mmlu-pro': 80.7, 'gpqa-diamond': 68.0, 'math-500': 82.2, 'swe-bench-verified': 62.3, ifeval: 90.8, mmmu: 71.8, 'lmarena-elo': 1300, 'hallucination-rate': 4.4 } },
  { slug: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', org: 'anthropic', type: ModelType.CHAT, release: '2024-10-22', ctx: 200000, maxOut: 8192, license: 'Proprietary', cutoff: '2024-04-01', input: [TEXT, IMAGE, FILE], output: [TEXT], caps: [...CHAT_CAPS, 'vision', 'prompt-caching'], description: 'Strong all-rounder especially for coding and agents.',
    offers: [['anthropic-api', 'claude-3-5-sonnet-20241022', 3, 15, { cached: 0.3, latency: 800, tps: 78 }], ['aws-bedrock', 'anthropic.claude-3-5-sonnet-20241022-v2:0', 3, 15], ['google-vertex-ai', 'claude-3-5-sonnet-v2@20241022', 3, 15], ['openrouter', 'anthropic/claude-3.5-sonnet', 3, 15]],
    scores: { 'mmlu-pro': 78.0, 'gpqa-diamond': 65.0, 'math-500': 78.3, humaneval: 93.7, 'swe-bench-verified': 49.0, ifeval: 90.2, mmmu: 70.4, 'lmarena-elo': 1283, 'hallucination-rate': 4.6, livecodebench: 38.9 } },
  { slug: 'claude-3.5-haiku', name: 'Claude 3.5 Haiku', org: 'anthropic', type: ModelType.CHAT, release: '2024-11-04', ctx: 200000, maxOut: 8192, license: 'Proprietary', cutoff: '2024-07-01', input: [TEXT], output: [TEXT], caps: [...CHAT_CAPS, 'prompt-caching'], description: 'Fastest Claude 3.5 model.',
    offers: [['anthropic-api', 'claude-3-5-haiku-20241022', 0.8, 4, { cached: 0.08, latency: 600, tps: 65 }], ['aws-bedrock', 'anthropic.claude-3-5-haiku-20241022-v1:0', 0.8, 4], ['openrouter', 'anthropic/claude-3.5-haiku', 0.8, 4]],
    scores: { 'mmlu-pro': 65.0, 'gpqa-diamond': 41.6, 'math-500': 69.4, humaneval: 88.1, 'swe-bench-verified': 40.6, 'lmarena-elo': 1236 } },
  { slug: 'claude-3-opus', name: 'Claude 3 Opus', org: 'anthropic', type: ModelType.CHAT, status: ModelStatus.DEPRECATED, release: '2024-03-04', ctx: 200000, maxOut: 4096, license: 'Proprietary', cutoff: '2023-08-01', input: [TEXT, IMAGE], output: [TEXT], caps: [...CHAT_CAPS, 'vision'], description: 'Previous-generation most capable Claude.',
    offers: [['anthropic-api', 'claude-3-opus-20240229', 15, 75], ['aws-bedrock', 'anthropic.claude-3-opus-20240229-v1:0', 15, 75, { available: false }]],
    scores: { 'mmlu-pro': 68.5, 'gpqa-diamond': 50.4, 'math-500': 60.1, humaneval: 84.9, mmmu: 59.4, 'lmarena-elo': 1247, 'hallucination-rate': 10.1 } },

  // ---------------- Google
  { slug: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', org: 'google', type: ModelType.REASONING, status: ModelStatus.PREVIEW, release: '2025-03-25', ctx: 1048576, maxOut: 65536, license: 'Proprietary', cutoff: '2025-01-01', input: [TEXT, IMAGE, AUDIO, VIDEO, FILE], output: [TEXT], caps: [...CHAT_CAPS, 'structured-outputs', 'reasoning', 'vision', 'audio-input', 'web-search', 'prompt-caching'], description: 'Google\'s thinking model with 1M-token context.',
    offers: [['google-ai-studio', 'gemini-2.5-pro-preview-03-25', 1.25, 10, { latency: 2000, tps: 150 }], ['google-vertex-ai', 'gemini-2.5-pro-preview-03-25', 1.25, 10], ['openrouter', 'google/gemini-2.5-pro-preview', 1.25, 10]],
    scores: { 'mmlu-pro': 86.0, 'gpqa-diamond': 84.0, 'aime-2024': 92.0, 'swe-bench-verified': 63.8, livecodebench: 70.4, mmmu: 81.7, 'lmarena-elo': 1440, 'hallucination-rate': 1.1 } },
  { slug: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', org: 'google', type: ModelType.CHAT, release: '2025-02-05', ctx: 1048576, maxOut: 8192, license: 'Proprietary', cutoff: '2024-08-01', input: [TEXT, IMAGE, AUDIO, VIDEO], output: [TEXT], caps: [...CHAT_CAPS, 'structured-outputs', 'vision', 'audio-input', 'web-search'], description: 'Fast, cheap multimodal workhorse.',
    offers: [['google-ai-studio', 'gemini-2.0-flash', 0.1, 0.4, { cached: 0.025, latency: 350, tps: 200 }], ['google-vertex-ai', 'gemini-2.0-flash-001', 0.15, 0.6], ['openrouter', 'google/gemini-2.0-flash-001', 0.1, 0.4]],
    scores: { 'mmlu-pro': 77.6, 'gpqa-diamond': 60.1, 'math-500': 90.9, livecodebench: 34.5, mmmu: 71.7, 'lmarena-elo': 1355, 'hallucination-rate': 0.7 } },
  { slug: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', org: 'google', type: ModelType.CHAT, release: '2024-05-14', ctx: 2097152, maxOut: 8192, license: 'Proprietary', cutoff: '2023-11-01', input: [TEXT, IMAGE, AUDIO, VIDEO], output: [TEXT], caps: [...CHAT_CAPS, 'vision', 'audio-input', 'prompt-caching'], description: 'First 2M-token context model.',
    offers: [['google-ai-studio', 'gemini-1.5-pro', 1.25, 5], ['google-vertex-ai', 'gemini-1.5-pro-002', 1.25, 5]],
    scores: { 'mmlu-pro': 75.8, 'gpqa-diamond': 59.1, 'math-500': 86.5, humaneval: 84.1, mmmu: 65.9, 'lmarena-elo': 1302 } },
  { slug: 'gemma-2-27b-it', name: 'Gemma 2 27B', org: 'google', type: ModelType.CHAT, release: '2024-06-27', ctx: 8192, maxOut: 8192, params: 27, open: true, license: 'Gemma Terms of Use', input: [TEXT], output: [TEXT], caps: ['streaming'], description: 'Open-weights model from the Gemini research line.',
    offers: [['together-ai', 'google/gemma-2-27b-it', 0.8, 0.8], ['deepinfra', 'google/gemma-2-27b-it', 0.27, 0.27], ['google-vertex-ai', 'gemma-2-27b-it', 0.3, 0.3]],
    scores: { 'mmlu-pro': 56.9, humaneval: 51.8, 'math-500': 42.3, 'lmarena-elo': 1220 } },

  // ---------------- Meta
  { slug: 'llama-3.1-405b-instruct', name: 'Llama 3.1 405B Instruct', org: 'meta', type: ModelType.CHAT, release: '2024-07-23', ctx: 128000, maxOut: 4096, params: 405, open: true, license: 'Llama 3.1 Community License', cutoff: '2023-12-01', input: [TEXT], output: [TEXT], caps: CHAT_CAPS, description: 'Largest open-weights Llama 3.1 model.',
    offers: [['together-ai', 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', 3.5, 3.5, { latency: 700, tps: 70 }], ['fireworks-ai', 'accounts/fireworks/models/llama-v3p1-405b-instruct', 3, 3, { latency: 600, tps: 75 }], ['aws-bedrock', 'meta.llama3-1-405b-instruct-v1:0', 2.4, 2.4], ['deepinfra', 'meta-llama/Meta-Llama-3.1-405B-Instruct', 0.8, 0.8, { latency: 900, tps: 25 }], ['openrouter', 'meta-llama/llama-3.1-405b-instruct', 0.8, 0.8]],
    scores: { 'mmlu-pro': 73.3, 'gpqa-diamond': 51.1, 'math-500': 73.8, humaneval: 89.0, ifeval: 88.6, 'lmarena-elo': 1267 } },
  { slug: 'llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', org: 'meta', type: ModelType.CHAT, release: '2024-12-06', ctx: 128000, maxOut: 8192, params: 70, open: true, license: 'Llama 3.3 Community License', cutoff: '2023-12-01', input: [TEXT], output: [TEXT], caps: CHAT_CAPS, description: '405B-class quality at 70B cost.',
    offers: [['groq', 'llama-3.3-70b-versatile', 0.59, 0.79, { latency: 200, tps: 275, uptime: 99.5 }], ['together-ai', 'meta-llama/Llama-3.3-70B-Instruct-Turbo', 0.88, 0.88, { latency: 450, tps: 110 }], ['fireworks-ai', 'accounts/fireworks/models/llama-v3p3-70b-instruct', 0.9, 0.9], ['deepinfra', 'meta-llama/Llama-3.3-70B-Instruct', 0.23, 0.4, { latency: 600, tps: 35 }], ['aws-bedrock', 'meta.llama3-3-70b-instruct-v1:0', 0.72, 0.72], ['openrouter', 'meta-llama/llama-3.3-70b-instruct', 0.12, 0.3]],
    scores: { 'mmlu-pro': 68.9, 'gpqa-diamond': 50.5, 'math-500': 77.0, humaneval: 88.4, ifeval: 92.1, 'lmarena-elo': 1257 } },
  { slug: 'llama-3.1-70b-instruct', name: 'Llama 3.1 70B Instruct', org: 'meta', type: ModelType.CHAT, release: '2024-07-23', ctx: 128000, maxOut: 4096, params: 70, open: true, license: 'Llama 3.1 Community License', cutoff: '2023-12-01', input: [TEXT], output: [TEXT], caps: CHAT_CAPS, description: 'Mid-size Llama 3.1.',
    offers: [['together-ai', 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', 0.88, 0.88], ['deepinfra', 'meta-llama/Meta-Llama-3.1-70B-Instruct', 0.23, 0.4], ['aws-bedrock', 'meta.llama3-1-70b-instruct-v1:0', 0.72, 0.72]],
    scores: { 'mmlu-pro': 66.4, 'gpqa-diamond': 46.7, 'math-500': 68.0, humaneval: 80.5, ifeval: 87.5, 'lmarena-elo': 1248 } },
  { slug: 'llama-3.1-8b-instruct', name: 'Llama 3.1 8B Instruct', org: 'meta', type: ModelType.CHAT, release: '2024-07-23', ctx: 128000, maxOut: 4096, params: 8, open: true, license: 'Llama 3.1 Community License', cutoff: '2023-12-01', input: [TEXT], output: [TEXT], caps: CHAT_CAPS, description: 'Small, fast open model for edge and high-volume use.',
    offers: [['groq', 'llama-3.1-8b-instant', 0.05, 0.08, { latency: 120, tps: 750 }], ['together-ai', 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', 0.18, 0.18], ['deepinfra', 'meta-llama/Meta-Llama-3.1-8B-Instruct', 0.02, 0.05], ['fireworks-ai', 'accounts/fireworks/models/llama-v3p1-8b-instruct', 0.2, 0.2]],
    scores: { 'mmlu-pro': 48.3, 'gpqa-diamond': 30.4, 'math-500': 51.9, humaneval: 72.6, ifeval: 80.4, 'lmarena-elo': 1176 } },
  { slug: 'llama-3.1-nemotron-70b-instruct', name: 'Llama 3.1 Nemotron 70B Instruct', org: 'nvidia', type: ModelType.CHAT, release: '2024-10-15', ctx: 128000, maxOut: 4096, params: 70, open: true, license: 'Llama 3.1 Community License', input: [TEXT], output: [TEXT], caps: ['streaming'], description: 'NVIDIA RLHF fine-tune of Llama 3.1 70B for helpfulness.',
    offers: [['deepinfra', 'nvidia/Llama-3.1-Nemotron-70B-Instruct', 0.12, 0.3], ['openrouter', 'nvidia/llama-3.1-nemotron-70b-instruct', 0.12, 0.3]],
    scores: { 'mmlu-pro': 68.0, 'lmarena-elo': 1269 } },

  // ---------------- Mistral
  { slug: 'mistral-large-2', name: 'Mistral Large 2', org: 'mistral-ai', type: ModelType.CHAT, release: '2024-07-24', ctx: 128000, maxOut: 8192, params: 123, open: true, license: 'Mistral Research License', input: [TEXT], output: [TEXT], caps: [...CHAT_CAPS, 'fine-tuning'], description: 'Mistral\'s flagship multilingual model.',
    offers: [['mistral-api', 'mistral-large-2411', 2, 6, { latency: 500, tps: 40 }], ['aws-bedrock', 'mistral.mistral-large-2407-v1:0', 2, 6], ['google-vertex-ai', 'mistral-large-2411', 2, 6], ['azure-ai', 'Mistral-Large-2411', 2, 6]],
    scores: { 'mmlu-pro': 69.4, 'gpqa-diamond': 48.6, 'math-500': 71.0, humaneval: 92.0, ifeval: 86.0, 'lmarena-elo': 1251 } },
  { slug: 'mistral-small-3', name: 'Mistral Small 3', org: 'mistral-ai', type: ModelType.CHAT, release: '2025-01-30', ctx: 32768, maxOut: 8192, params: 24, open: true, license: 'Apache 2.0', input: [TEXT], output: [TEXT], caps: CHAT_CAPS, description: 'Latency-optimised 24B model under Apache 2.0.',
    offers: [['mistral-api', 'mistral-small-2501', 0.1, 0.3], ['together-ai', 'mistralai/Mistral-Small-24B-Instruct-2501', 0.8, 0.8], ['deepinfra', 'mistralai/Mistral-Small-24B-Instruct-2501', 0.07, 0.14]],
    scores: { 'mmlu-pro': 66.3, 'gpqa-diamond': 45.3, humaneval: 84.8, 'math-500': 70.6, ifeval: 82.9, 'lmarena-elo': 1217 } },
  { slug: 'codestral', name: 'Codestral 25.01', org: 'mistral-ai', type: ModelType.CODE, release: '2025-01-13', ctx: 256000, maxOut: 8192, params: 22, license: 'Mistral Non-Production License', input: [TEXT], output: [TEXT], caps: ['streaming', 'tool-calling'], description: 'Code model with fill-in-the-middle across 80+ languages.',
    offers: [['mistral-api', 'codestral-2501', 0.3, 0.9, { latency: 250, tps: 150 }]],
    scores: { humaneval: 86.6, livecodebench: 37.9 } },
  { slug: 'mixtral-8x7b-instruct', name: 'Mixtral 8x7B Instruct', org: 'mistral-ai', type: ModelType.CHAT, status: ModelStatus.DEPRECATED, release: '2023-12-11', ctx: 32768, maxOut: 4096, params: 46.7, open: true, license: 'Apache 2.0', input: [TEXT], output: [TEXT], caps: CHAT_CAPS, description: 'Sparse mixture-of-experts pioneer.',
    offers: [['together-ai', 'mistralai/Mixtral-8x7B-Instruct-v0.1', 0.6, 0.6], ['deepinfra', 'mistralai/Mixtral-8x7B-Instruct-v0.1', 0.24, 0.24], ['groq', 'mixtral-8x7b-32768', 0.24, 0.24, { available: false }]],
    scores: { 'mmlu-pro': 43.3, humaneval: 40.2, 'lmarena-elo': 1114 } },

  // ---------------- xAI
  { slug: 'grok-3', name: 'Grok 3', org: 'xai', type: ModelType.CHAT, release: '2025-02-17', ctx: 131072, maxOut: 16384, license: 'Proprietary', input: [TEXT], output: [TEXT], caps: [...CHAT_CAPS, 'structured-outputs', 'web-search'], description: 'xAI flagship trained on the Colossus cluster.',
    offers: [['xai-api', 'grok-3', 3, 15, { latency: 700, tps: 70 }], ['openrouter', 'x-ai/grok-3-beta', 3, 15]],
    scores: { 'mmlu-pro': 79.9, 'gpqa-diamond': 75.4, 'aime-2024': 52.2, livecodebench: 57.0, 'lmarena-elo': 1402 } },
  { slug: 'grok-2', name: 'Grok 2', org: 'xai', type: ModelType.CHAT, release: '2024-08-13', ctx: 131072, maxOut: 32768, license: 'Proprietary', input: [TEXT, IMAGE], output: [TEXT], caps: [...CHAT_CAPS, 'vision'], description: 'Previous-generation Grok with vision.',
    offers: [['xai-api', 'grok-2-1212', 2, 10]],
    scores: { 'mmlu-pro': 75.5, 'gpqa-diamond': 56.0, 'math-500': 76.1, humaneval: 88.4, mmmu: 66.1, 'lmarena-elo': 1288 } },

  // ---------------- DeepSeek
  { slug: 'deepseek-r1', name: 'DeepSeek R1', org: 'deepseek', type: ModelType.REASONING, release: '2025-01-20', ctx: 128000, maxOut: 32768, params: 671, open: true, license: 'MIT', input: [TEXT], output: [TEXT], caps: ['reasoning', 'streaming', 'json-mode'], description: 'Open-weights reasoning model trained with large-scale RL.',
    offers: [['deepseek-api', 'deepseek-reasoner', 0.55, 2.19, { cached: 0.14, latency: 3000, tps: 25, uptime: 97.5 }], ['together-ai', 'deepseek-ai/DeepSeek-R1', 3, 7, { latency: 1500, tps: 60 }], ['fireworks-ai', 'accounts/fireworks/models/deepseek-r1', 3, 8], ['deepinfra', 'deepseek-ai/DeepSeek-R1', 0.75, 2.4], ['aws-bedrock', 'us.deepseek.r1-v1:0', 1.35, 5.4], ['openrouter', 'deepseek/deepseek-r1', 0.55, 2.19]],
    scores: { 'mmlu-pro': 84.0, 'gpqa-diamond': 71.5, 'math-500': 97.3, 'aime-2024': 79.8, 'swe-bench-verified': 49.2, livecodebench: 65.9, ifeval: 83.3, 'lmarena-elo': 1358, 'hallucination-rate': 14.3 } },
  { slug: 'deepseek-v3', name: 'DeepSeek V3', org: 'deepseek', type: ModelType.CHAT, release: '2024-12-26', ctx: 128000, maxOut: 8192, params: 671, open: true, license: 'MIT', input: [TEXT], output: [TEXT], caps: [...CHAT_CAPS, 'prompt-caching'], description: '671B MoE (37B active) frontier open model.',
    offers: [['deepseek-api', 'deepseek-chat', 0.27, 1.1, { cached: 0.07, latency: 1200, tps: 30, uptime: 97.5 }], ['together-ai', 'deepseek-ai/DeepSeek-V3', 1.25, 1.25], ['fireworks-ai', 'accounts/fireworks/models/deepseek-v3', 0.9, 0.9], ['deepinfra', 'deepseek-ai/DeepSeek-V3', 0.49, 0.89], ['openrouter', 'deepseek/deepseek-chat', 0.27, 1.1]],
    scores: { 'mmlu-pro': 75.9, 'gpqa-diamond': 59.1, 'math-500': 90.2, 'aime-2024': 39.2, humaneval: 82.6, 'swe-bench-verified': 42.0, livecodebench: 37.6, ifeval: 86.1, 'lmarena-elo': 1318, 'hallucination-rate': 3.9 } },

  // ---------------- Alibaba
  { slug: 'qwen2.5-72b-instruct', name: 'Qwen2.5 72B Instruct', org: 'alibaba', type: ModelType.CHAT, release: '2024-09-19', ctx: 131072, maxOut: 8192, params: 72.7, open: true, license: 'Qwen License', input: [TEXT], output: [TEXT], caps: CHAT_CAPS, description: 'Strong multilingual open model with long context.',
    offers: [['together-ai', 'Qwen/Qwen2.5-72B-Instruct-Turbo', 1.2, 1.2], ['deepinfra', 'Qwen/Qwen2.5-72B-Instruct', 0.13, 0.4], ['fireworks-ai', 'accounts/fireworks/models/qwen2p5-72b-instruct', 0.9, 0.9], ['openrouter', 'qwen/qwen-2.5-72b-instruct', 0.13, 0.4]],
    scores: { 'mmlu-pro': 71.1, 'gpqa-diamond': 49.0, 'math-500': 83.1, humaneval: 86.6, ifeval: 84.1, 'lmarena-elo': 1257 } },
  { slug: 'qwen2.5-coder-32b-instruct', name: 'Qwen2.5 Coder 32B Instruct', org: 'alibaba', type: ModelType.CODE, release: '2024-11-12', ctx: 131072, maxOut: 8192, params: 32.5, open: true, license: 'Apache 2.0', input: [TEXT], output: [TEXT], caps: CHAT_CAPS, description: 'Open code model competitive with frontier closed models.',
    offers: [['together-ai', 'Qwen/Qwen2.5-Coder-32B-Instruct', 0.8, 0.8], ['deepinfra', 'Qwen/Qwen2.5-Coder-32B-Instruct', 0.07, 0.16], ['groq', 'qwen-2.5-coder-32b', 0.79, 0.79, { latency: 180, tps: 400 }]],
    scores: { humaneval: 92.7, livecodebench: 31.4, 'mmlu-pro': 50.4 } },

  // ---------------- Cohere / Amazon / Microsoft
  { slug: 'command-r-plus', name: 'Command R+', org: 'cohere', type: ModelType.CHAT, release: '2024-08-30', ctx: 128000, maxOut: 4096, params: 104, open: true, license: 'CC-BY-NC 4.0', input: [TEXT], output: [TEXT], caps: [...CHAT_CAPS, 'web-search'], description: 'RAG- and tool-use-optimised enterprise model.',
    offers: [['aws-bedrock', 'cohere.command-r-plus-v1:0', 2.5, 10], ['azure-ai', 'Cohere-command-r-plus-08-2024', 2.5, 10], ['openrouter', 'cohere/command-r-plus-08-2024', 2.5, 10]],
    scores: { 'mmlu-pro': 43.0, ifeval: 74.0, 'lmarena-elo': 1190 } },
  { slug: 'embed-english-v3', name: 'Embed English v3', org: 'cohere', type: ModelType.EMBEDDING, release: '2023-11-02', ctx: 512, license: 'Proprietary', input: [TEXT], output: [EMBEDDING], caps: [], description: '1024-dimension English embedding model.',
    offers: [['aws-bedrock', 'cohere.embed-english-v3', 0.1, 0]], scores: {} },
  { slug: 'nova-pro', name: 'Amazon Nova Pro', org: 'amazon', type: ModelType.CHAT, release: '2024-12-03', ctx: 300000, maxOut: 5120, license: 'Proprietary', input: [TEXT, IMAGE, VIDEO], output: [TEXT], caps: [...CHAT_CAPS, 'vision', 'fine-tuning'], description: 'Multimodal model balancing accuracy, speed and cost.',
    offers: [['aws-bedrock', 'amazon.nova-pro-v1:0', 0.8, 3.2, { latency: 450, tps: 95, uptime: 99.9 }], ['openrouter', 'amazon/nova-pro-v1', 0.8, 3.2]],
    scores: { 'mmlu-pro': 69.0, 'gpqa-diamond': 46.9, 'math-500': 76.6, humaneval: 89.0, ifeval: 92.1, mmmu: 61.7, 'lmarena-elo': 1245 } },
  { slug: 'phi-4', name: 'Phi-4', org: 'microsoft', type: ModelType.CHAT, release: '2024-12-12', ctx: 16384, maxOut: 16384, params: 14, open: true, license: 'MIT', input: [TEXT], output: [TEXT], caps: ['streaming'], description: '14B small language model trained on synthetic data.',
    offers: [['azure-ai', 'Phi-4', 0.125, 0.5], ['deepinfra', 'microsoft/phi-4', 0.07, 0.14], ['openrouter', 'microsoft/phi-4', 0.07, 0.14]],
    scores: { 'mmlu-pro': 70.4, 'gpqa-diamond': 56.1, 'math-500': 80.4, humaneval: 82.6, ifeval: 63.0, 'lmarena-elo': 1205 } },
];

/**
 * Known public price changes, oldest first: [model, provider, ISO date, input $/1M, output $/1M].
 * The LAST entry of each (model, provider) timeline must equal that offering's current price above —
 * the seed refuses to run otherwise, so history and current prices are always consistent.
 * Offerings without an entry get a single "listed" event at the model's release date.
 */
export const priceTimelines: [model: string, provider: string, date: string, input: number, output: number][] = [
  ['gpt-4o', 'openai-api', '2024-05-13', 5, 15],
  ['gpt-4o', 'openai-api', '2024-08-06', 2.5, 10],
  ['gemini-1.5-pro', 'google-ai-studio', '2024-05-14', 3.5, 10.5],
  ['gemini-1.5-pro', 'google-ai-studio', '2024-10-01', 1.25, 5],
  ['deepseek-v3', 'deepseek-api', '2024-12-26', 0.14, 0.28],
  ['deepseek-v3', 'deepseek-api', '2025-02-08', 0.27, 1.1],
];
