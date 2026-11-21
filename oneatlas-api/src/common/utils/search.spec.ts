import { containsInsensitive, escapeLike } from './search';

describe('escapeLike', () => {
  it('escapes LIKE wildcards and the escape character itself', () => {
    expect(escapeLike('100%')).toBe('100\\%');
    expect(escapeLike('a_b')).toBe('a\\_b');
    expect(escapeLike('back\\slash')).toBe('back\\\\slash');
    expect(escapeLike('plain text')).toBe('plain text');
  });
  it('containsInsensitive builds an insensitive filter with an escaped needle', () => {
    expect(containsInsensitive('%')).toEqual({ contains: '\\%', mode: 'insensitive' });
  });
});
