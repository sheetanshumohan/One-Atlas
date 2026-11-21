import { toBoolean, toNumber, toStringArray, trimString, upper } from './transforms';

describe('query transforms', () => {
  describe('toStringArray', () => {
    it('splits comma-separated values, trims, drops empties and de-duplicates', () => {
      expect(toStringArray(' a, b ,,a ')).toEqual(['a', 'b']);
    });
    it('supports repeated params and mixing both styles', () => {
      expect(toStringArray(['a,b', 'c', 'b'])).toEqual(['a', 'b', 'c']);
    });
    it('returns undefined for missing values and [] for empty strings', () => {
      expect(toStringArray(undefined)).toBeUndefined();
      expect(toStringArray(null)).toBeUndefined();
      expect(toStringArray('')).toEqual([]);
    });
  });

  describe('toBoolean (strict)', () => {
    it.each([
      ['true', true], ['TRUE', true], ['1', true], [true, true],
      ['false', false], ['0', false], [' False ', false], [false, false],
    ])('%p -> %p', (input, expected) => expect(toBoolean(input)).toBe(expected));
    it('leaves invalid values untouched so the validator rejects them', () => {
      expect(toBoolean('yes')).toBe('yes');
      expect(toBoolean('')).toBe('');
      expect(toBoolean(2)).toBe(2);
    });
  });

  describe('toNumber (strict)', () => {
    it('converts numeric strings', () => {
      expect(toNumber('42')).toBe(42);
      expect(toNumber('0.5')).toBe(0.5);
      expect(toNumber('-3')).toBe(-3);
    });
    it('does not coerce empty / non-numeric strings (Number("") would be 0)', () => {
      expect(toNumber('')).toBe('');
      expect(toNumber('  ')).toBe('  ');
      expect(toNumber('abc')).toBe('abc');
      expect(toNumber('12px')).toBe('12px');
    });
  });

  it('trimString and upper', () => {
    expect(trimString('  x ')).toBe('x');
    expect(trimString(5)).toBe(5);
    expect(upper('chat')).toBe('CHAT');
    expect(upper(['chat', 'code'])).toEqual(['CHAT', 'CODE']);
  });
});
