import { describe, expect, it } from 'vitest';
import { readList, readPage, readString, toggle, withParams } from './query';

describe('URL state helpers', () => {
  it('readList handles comma-separated, repeated, blank and duplicate values', () => {
    expect(readList({ a: 'x,y' }, 'a')).toEqual(['x', 'y']);
    expect(readList({ a: ['x', 'y,x'] }, 'a')).toEqual(['x', 'y']);
    expect(readList({ a: ' , ' }, 'a')).toEqual([]);
    expect(readList({}, 'a')).toEqual([]);
  });

  it('readString and readPage are defensive', () => {
    expect(readString({ q: '  hi ' }, 'q')).toBe('hi');
    expect(readString({ q: ['a', 'b'] }, 'q')).toBe('a');
    expect(readString({ q: '   ' }, 'q')).toBeUndefined();
    expect(readPage({ page: '3' })).toBe(3);
    for (const bad of ['0', '-1', '1.5', 'abc', undefined]) expect(readPage({ page: bad })).toBe(1);
  });

  it('withParams merges, replaces and removes keys', () => {
    const current = { q: 'llama', page: '3', organization: 'meta' };
    expect(withParams(current, { page: [] })).toBe('?q=llama&organization=meta');
    expect(withParams(current, { organization: ['meta', 'openai'] })).toBe('?q=llama&page=3&organization=meta%2Copenai');
    expect(withParams(current, { q: '' })).toBe('?page=3&organization=meta');
    expect(withParams({}, {})).toBe('');
  });

  it('toggle adds or removes', () => {
    expect(toggle(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggle(['a', 'b'], 'a')).toEqual(['b']);
  });
});
