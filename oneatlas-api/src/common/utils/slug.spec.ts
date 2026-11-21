import { isValidSlug, slugify } from './slug';

describe('slugify', () => {
  it.each([
    ['GPT-4o', 'gpt-4o'],
    ['Claude 3.5 Sonnet', 'claude-3.5-sonnet'],
    ['  Llama 3.1   405B  Instruct ', 'llama-3.1-405b-instruct'],
    ['Mistral AI', 'mistral-ai'],
    ['Qwen2.5_Coder/32B', 'qwen2.5-coder-32b'],
    ['Café Ñandú', 'cafe-nandu'],
    ['...leading.and.trailing...', 'leading.and.trailing'],
    ['a -- b', 'a-b'],
    ['v1..2', 'v1.2'],
    ['x.-y', 'x-y'],
    ['!!!', ''],
  ])('%s -> %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('always produces a valid slug when non-empty', () => {
    for (const s of ['GPT-4o', 'A.B.C', 'x_y z', 'Ünïcödé 2.0', '-a-', 'a'.repeat(300)]) {
      const out = slugify(s);
      expect(out === '' || isValidSlug(out)).toBe(true);
    }
  });

  it('truncates to 100 characters without a trailing separator', () => {
    const out = slugify(`${'a'.repeat(99)}-bbbb`);
    expect(out.length).toBeLessThanOrEqual(100);
    expect(out.endsWith('-')).toBe(false);
  });
});

describe('isValidSlug', () => {
  it.each(['gpt-4o', 'claude-3.5-sonnet', 'o1', 'a'])('accepts %s', (s) => expect(isValidSlug(s)).toBe(true));
  it.each(['', 'GPT', 'a--b', 'a..b', '-a', 'a-', '.a', 'a b', 'a/b', 'a_b', 'a'.repeat(101)])('rejects "%s"', (s) =>
    expect(isValidSlug(s)).toBe(false),
  );
});
