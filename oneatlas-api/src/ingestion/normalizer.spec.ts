import {
  cleanName, deriveCapabilities, inferModelType, normalizeRecord, parseModalities, parseReleaseDate,
  perTokenToPerMillion, positiveInt, resolveOrganization,
} from './normalizer';

const NOW = new Date('2026-01-01T00:00:00Z');

const valid = (over: Record<string, unknown> = {}) => ({
  id: 'openai/gpt-4o',
  name: 'OpenAI: GPT-4o',
  description: '  Omni model  ',
  created: 1715558400, // 2024-05-13
  context_length: 128000,
  architecture: { modality: 'text+image->text', input_modalities: ['text', 'image'], output_modalities: ['text'] },
  pricing: { prompt: '0.0000025', completion: '0.00001', input_cache_read: '0.00000125' },
  top_provider: { context_length: 128000, max_completion_tokens: 16384 },
  supported_parameters: ['tools', 'tool_choice', 'response_format', 'structured_outputs', 'temperature'],
  ...over,
});

function ok(raw: unknown) {
  const r = normalizeRecord(raw, NOW);
  if (!r.ok) throw new Error(`expected ok, got ${r.kind}: ${r.reason}`);
  return r.value;
}

describe('perTokenToPerMillion (exact decimal maths)', () => {
  it.each([
    ['0.0000025', '2.5'],
    ['0.00000015', '0.15'],
    ['0.000001', '1'],
    ['0', '0'],
    [0.0000025, '2.5'],
    ['1e-6', '1'],
    ['0.0000000001234567', '0.000123'], // rounded to 6dp
  ])('%p -> %s', (input, expected) => {
    expect(perTokenToPerMillion(input)!.toString()).toBe(expected);
  });

  it('avoids float drift that naive multiplication causes', () => {
    expect(Number('0.0000029') * 1e6).not.toBe(2.9); // 2.9000000000000004 in IEEE-754
    expect(Number('0.00000079') * 1e6).not.toBe(0.79); // 0.7899999999999999
    expect(perTokenToPerMillion('0.0000029')!.toString()).toBe('2.9');
    expect(perTokenToPerMillion('0.00000079')!.toString()).toBe('0.79');
  });

  it.each([['abc'], [''], [null], [undefined], [{}], [NaN], [Infinity], ['1,5']])('rejects %p', (v) => {
    expect(perTokenToPerMillion(v)).toBeNull();
  });
});

describe('positiveInt', () => {
  it('accepts positive integers and integer strings', () => {
    expect(positiveInt(128000)).toBe(128000);
    expect(positiveInt('4096')).toBe(4096);
  });
  it.each([[0], [-1], [1.5], ['abc'], [''], [null], [1e9]])('rejects %p', (v) => expect(positiveInt(v)).toBeNull());
});

describe('parseReleaseDate', () => {
  it('parses unix seconds, unix millis and ISO strings to a UTC date', () => {
    expect(parseReleaseDate(1715558400, NOW)!.toISOString()).toBe('2024-05-13T00:00:00.000Z');
    expect(parseReleaseDate(1715558400000, NOW)!.toISOString()).toBe('2024-05-13T00:00:00.000Z');
    expect(parseReleaseDate('2024-05-13T15:30:00Z', NOW)!.toISOString()).toBe('2024-05-13T00:00:00.000Z');
  });
  it('rejects implausible or invalid dates', () => {
    expect(parseReleaseDate(0, NOW)).toBeNull(); // 1970
    expect(parseReleaseDate('2099-01-01', NOW)).toBeNull(); // far future
    expect(parseReleaseDate('not a date', NOW)).toBeNull();
    expect(parseReleaseDate(undefined, NOW)).toBeNull();
  });
});

describe('parseModalities', () => {
  it('prefers explicit arrays', () => {
    expect(parseModalities({ input_modalities: ['text', 'image', 'file'], output_modalities: ['text'] })).toEqual({ input: ['TEXT', 'IMAGE', 'FILE'], output: ['TEXT'] });
  });
  it('falls back to the "a+b->c" string', () => {
    expect(parseModalities({ modality: 'text+image->text' })).toEqual({ input: ['TEXT', 'IMAGE'], output: ['TEXT'] });
    expect(parseModalities({ modality: 'text->image' })).toEqual({ input: ['TEXT'], output: ['IMAGE'] });
  });
  it('drops unknown modalities, de-duplicates and is case-insensitive', () => {
    expect(parseModalities({ input_modalities: ['TEXT', 'text', 'hologram'], output_modalities: ['Embeddings'] })).toEqual({ input: ['TEXT'], output: ['EMBEDDING'] });
  });
  it('handles missing architecture', () => {
    expect(parseModalities(null)).toEqual({ input: [], output: [] });
    expect(parseModalities({ modality: 'garbage' })).toEqual({ input: [], output: [] });
  });
});

describe('deriveCapabilities', () => {
  it('maps supported parameters and modalities to normalised capability slugs', () => {
    expect(deriveCapabilities(['tools', 'tool_choice', 'response_format', 'reasoning', 'top_p'], ['TEXT', 'IMAGE', 'AUDIO'], null)).toEqual([
      'audio-input', 'json-mode', 'reasoning', 'tool-calling', 'vision',
    ]);
  });
  it('adds prompt-caching when a cached price exists', () => {
    expect(deriveCapabilities([], ['TEXT'], perTokenToPerMillion('0.000001'))).toEqual(['prompt-caching']);
  });
  it('tolerates non-array input', () => {
    expect(deriveCapabilities('tools', ['TEXT'], null)).toEqual([]);
  });
});

describe('inferModelType', () => {
  it.each([
    ['text-embedding-3', ['EMBEDDING'], [], 'EMBEDDING'],
    ['dall-e', ['IMAGE'], [], 'IMAGE_GENERATION'],
    ['tts-1', ['AUDIO'], [], 'TEXT_TO_SPEECH'],
    ['o1', ['TEXT'], ['reasoning'], 'REASONING'],
    ['qwen2.5-coder-32b', ['TEXT'], [], 'CODE'],
    ['codestral', ['TEXT'], [], 'CODE'],
    ['gpt-4o', ['TEXT'], ['tool-calling'], 'CHAT'],
    ['gpt-4o-audio', ['TEXT', 'AUDIO'], [], 'CHAT'],
    ['unicode-model', ['TEXT'], [], 'CHAT'], // "code" inside a word must not match
  ] as const)('%s -> %s', (slug, out, caps, expected) => {
    expect(inferModelType(slug, [...out], [...caps])).toBe(expected);
  });
});

describe('cleanName / resolveOrganization', () => {
  it('strips vendor prefixes', () => {
    expect(cleanName('OpenAI: GPT-4o')).toBe('GPT-4o');
    expect(cleanName('Meta: Llama 3.1  70B')).toBe('Llama 3.1 70B');
    expect(cleanName('GPT-4o')).toBe('GPT-4o');
  });
  it('maps known vendor prefixes to canonical organizations', () => {
    expect(resolveOrganization('meta-llama')).toEqual({ slug: 'meta', name: 'Meta' });
    expect(resolveOrganization('mistralai')).toEqual({ slug: 'mistral-ai', name: 'Mistral AI' });
    expect(resolveOrganization('x-ai')).toEqual({ slug: 'xai', name: 'xAI' });
    expect(resolveOrganization('Qwen')).toEqual({ slug: 'alibaba', name: 'Alibaba (Qwen)' });
  });
  it('derives a slug and title-cased name for unknown vendors', () => {
    expect(resolveOrganization('new-lab_ai')).toEqual({ slug: 'new-lab-ai', name: 'New Lab Ai' });
  });
});

describe('normalizeRecord', () => {
  it('normalises a complete record', () => {
    const v = ok(valid());
    expect(v).toMatchObject({
      slug: 'gpt-4o',
      name: 'GPT-4o',
      organizationSlug: 'openai',
      description: 'Omni model',
      type: 'CHAT',
      contextWindow: 128000,
      maxOutputTokens: 16384,
      inputModalities: ['TEXT', 'IMAGE'],
      outputModalities: ['TEXT'],
      capabilities: ['json-mode', 'prompt-caching', 'structured-outputs', 'tool-calling', 'vision'],
      openWeights: null,
    });
    expect(v.releaseDate!.toISOString().slice(0, 10)).toBe('2024-05-13');
    expect(v.offering.providerModelId).toBe('openai/gpt-4o');
    expect(v.offering.inputPricePerMTok.toNumber()).toBe(2.5);
    expect(v.offering.outputPricePerMTok.toNumber()).toBe(10);
    expect(v.offering.cachedInputPerMTok!.toNumber()).toBe(1.25);
  });

  it('marks open weights when a Hugging Face id is present', () => {
    expect(ok(valid({ id: 'meta-llama/llama-3.1-8b-instruct', hugging_face_id: 'meta-llama/Llama-3.1-8B-Instruct' }))).toMatchObject({
      organizationSlug: 'meta', slug: 'llama-3.1-8b-instruct', openWeights: true,
    });
  });

  it('falls back to the id when name is missing / empty', () => {
    expect(ok(valid({ name: undefined })).name).toBe('gpt-4o');
    expect(ok(valid({ name: '   ' })).name).toBe('gpt-4o');
  });

  it('defaults to TEXT modalities when none are given', () => {
    const v = ok(valid({ architecture: undefined }));
    expect(v.inputModalities).toEqual(['TEXT']);
    expect(v.outputModalities).toEqual(['TEXT']);
  });

  it('uses top_provider context when context_length is missing', () => {
    expect(ok(valid({ context_length: null })).contextWindow).toBe(128000);
  });

  it('drops inconsistent max output (> context) instead of rejecting the record', () => {
    expect(ok(valid({ top_provider: { max_completion_tokens: 999999 }, context_length: 1000 })).maxOutputTokens).toBeNull();
  });

  it('drops an inconsistent cached price (> input price)', () => {
    const v = ok(valid({ pricing: { prompt: '0.000001', completion: '0.000002', input_cache_read: '0.00001' } }));
    expect(v.offering.cachedInputPerMTok).toBeNull();
    expect(v.capabilities).not.toContain('prompt-caching');
  });

  it('accepts free models (price 0)', () => {
    const v = ok(valid({ pricing: { prompt: '0', completion: '0' } }));
    expect(v.offering.inputPricePerMTok.toNumber()).toBe(0);
  });

  it.each([
    [null, 'invalid', /object/],
    [[], 'invalid', /object/],
    ['str', 'invalid', /object/],
    [{ ...valid(), id: 'no-slash' }, 'invalid', /organization/],
    [{ ...valid(), id: 42 }, 'invalid', /id/],
    [{ ...valid(), id: 'openai/gpt-4o:free' }, 'skipped', /variant/],
    [{ ...valid(), pricing: undefined }, 'invalid', /required/],
    [{ ...valid(), pricing: { prompt: '0.000001' } }, 'invalid', /required/],
    [{ ...valid(), pricing: { prompt: 'abc', completion: '0' } }, 'invalid', /numeric/],
    [{ ...valid(), pricing: { prompt: '-1', completion: '-1' } }, 'skipped', /dynamic/],
    [{ ...valid(), pricing: { prompt: '0.5', completion: '1' } }, 'invalid', /sanity/],
    [{ ...valid(), id: 'openai/!!!' }, 'invalid', /slug/],
  ])('rejects %j as %s', (raw, kind, reason) => {
    const r = normalizeRecord(raw, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.kind).toBe(kind);
      expect(r.reason).toMatch(reason);
    }
  });

  it('is deterministic (same input -> same output)', () => {
    expect(JSON.stringify(ok(valid()))).toBe(JSON.stringify(ok(valid())));
  });
});
