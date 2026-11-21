import { relevance } from './search.module';

describe('search relevance', () => {
  it('orders exact > prefix > word-prefix > substring > none', () => {
    expect(relevance('gpt-4o', 'GPT-4o')).toBe(0);
    expect(relevance('gpt', 'GPT-4o')).toBe(1);
    expect(relevance('sonnet', 'Claude 3.5 Sonnet')).toBe(2);
    expect(relevance('onne', 'Claude 3.5 Sonnet')).toBe(3);
    expect(relevance('zzz', 'Claude')).toBe(4);
  });
  it('uses the best of several fields and ignores nulls', () => {
    expect(relevance('llama', null, 'Meta Llama', 'llama-3')).toBe(1);
  });
});
