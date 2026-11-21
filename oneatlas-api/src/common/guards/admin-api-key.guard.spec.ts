import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AppConfig } from '../../config/env';
import { AdminApiKeyGuard, extractApiKey, safeEqual } from './admin-api-key.guard';

const ctx = (headers: Record<string, string>) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ headers }) }) }) as unknown as ExecutionContext;
const guard = (adminApiKey?: string) => new AdminApiKeyGuard({ adminApiKey } as AppConfig);

describe('AdminApiKeyGuard', () => {
  it('extracts the key from x-api-key or Authorization: Bearer', () => {
    expect(extractApiKey({ headers: { 'x-api-key': 'k1' } })).toBe('k1');
    expect(extractApiKey({ headers: { authorization: 'Bearer k2' } })).toBe('k2');
    expect(extractApiKey({ headers: { authorization: 'bearer   k3 ' } })).toBe('k3');
    expect(extractApiKey({ headers: { authorization: 'Basic abc' } })).toBeUndefined();
    expect(extractApiKey({ headers: { authorization: 'Bearer ' } })).toBeUndefined();
    expect(extractApiKey({ headers: {} })).toBeUndefined();
  });

  it('safeEqual compares in constant time irrespective of length', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcdef')).toBe(false);
  });

  it('allows a correct key', () => {
    expect(guard('secret').canActivate(ctx({ 'x-api-key': 'secret' }))).toBe(true);
    expect(guard('secret').canActivate(ctx({ authorization: 'Bearer secret' }))).toBe(true);
  });

  it('401 when missing, 403 when wrong', () => {
    expect(() => guard('secret').canActivate(ctx({}))).toThrow(UnauthorizedException);
    expect(() => guard('secret').canActivate(ctx({ 'x-api-key': 'nope' }))).toThrow(ForbiddenException);
  });

  it('fails closed (403) when no key is configured, even if a key is sent', () => {
    expect(() => guard(undefined).canActivate(ctx({ 'x-api-key': '' }))).toThrow(ForbiddenException);
    expect(() => guard(undefined).canActivate(ctx({ 'x-api-key': 'anything' }))).toThrow(/disabled/);
  });
});
