import { ArgumentsHost, BadRequestException, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Prisma } from '@prisma/client';
import { AllExceptionsFilter } from './all-exceptions.filter';

const known = (code: string, meta?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError('db error with SQL details', { code, clientVersion: 'test', meta });

describe('AllExceptionsFilter.normalize', () => {
  const filter = new AllExceptionsFilter();

  it.each([
    ['P2002', 409, 'CONFLICT'],
    ['P2025', 404, 'NOT_FOUND'],
    ['P2003', 409, 'CONFLICT'],
    ['P2000', 400, 'VALIDATION_ERROR'],
    ['P2004', 400, 'CONSTRAINT_VIOLATION'],
    ['P2024', 503, 'SERVICE_UNAVAILABLE'],
    ['P9999', 500, 'INTERNAL_ERROR'],
  ])('maps Prisma %s -> %i %s', (code, status, errCode) => {
    expect(filter.normalize(known(code))).toMatchObject({ status, code: errCode });
  });

  it('reports the conflicting fields for unique violations', () => {
    expect(filter.normalize(known('P2002', { target: ['slug'] }))).toMatchObject({ message: expect.stringContaining('slug'), details: { fields: ['slug'] } });
  });

  it('never leaks database messages', () => {
    const n = filter.normalize(known('P9999'));
    expect(n.message).toBe('Internal server error');
  });

  it('maps unknown errors to 500 without details', () => {
    expect(filter.normalize(new Error('secret stack'))).toEqual({ status: 500, code: 'INTERNAL_ERROR', message: 'Internal server error' });
    expect(filter.normalize('a string')).toMatchObject({ status: 500 });
  });

  it('maps check-constraint violations from the database', () => {
    const e = new Prisma.PrismaClientUnknownRequestError('new row violates check constraint "x"', { clientVersion: 't' });
    expect(filter.normalize(e)).toMatchObject({ status: 400, code: 'CONSTRAINT_VIOLATION' });
  });

  it('maps body-parser (http-errors) client errors', () => {
    expect(filter.normalize({ status: 413, expose: true, type: 'entity.too.large', message: 'request entity too large' })).toEqual({
      status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large (max 2MB)',
    });
    expect(filter.normalize({ status: 400, expose: true, type: 'entity.parse.failed' })).toMatchObject({ status: 400, message: 'Malformed JSON body' });
    expect(filter.normalize({ statusCode: 415, expose: true, message: 'unsupported charset' })).toMatchObject({ status: 415, code: 'BAD_REQUEST' });
    // server errors / non-exposed errors are never echoed
    expect(filter.normalize({ status: 500, expose: false, message: 'secret' })).toMatchObject({ status: 500, message: 'Internal server error' });
    expect(filter.normalize({ status: 400, message: 'not exposed' })).toMatchObject({ status: 500 });
  });

  it('maps Prisma validation errors to 400', () => {
    const e = new Prisma.PrismaClientValidationError('bad', { clientVersion: 't' });
    expect(filter.normalize(e)).toMatchObject({ status: 400, code: 'BAD_REQUEST' });
  });

  it('preserves explicit codes and details from HttpExceptions', () => {
    const e = new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Request validation failed', details: [{ field: 'x', messages: ['y'] }] });
    expect(filter.normalize(e)).toEqual({ status: 400, code: 'VALIDATION_ERROR', message: 'Request validation failed', details: [{ field: 'x', messages: ['y'] }] });
  });

  it('derives codes from status for plain HttpExceptions', () => {
    expect(filter.normalize(new NotFoundException())).toMatchObject({ status: 404, code: 'NOT_FOUND' });
    expect(filter.normalize(new PayloadTooLargeException())).toMatchObject({ status: 413, code: 'PAYLOAD_TOO_LARGE' });
    expect(filter.normalize(new ThrottlerException())).toMatchObject({ status: 429, code: 'RATE_LIMITED' });
  });

  it('writes the envelope with path, timestamp and request id', () => {
    const json = jest.fn();
    const setHeader = jest.fn();
    const res = { headersSent: false, status: jest.fn(() => ({ json })), setHeader };
    const req = { originalUrl: '/api/v1/x', headers: {}, method: 'GET' };
    const host = { switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }) } as unknown as ArgumentsHost;
    filter.catch(new NotFoundException({ code: 'NOT_FOUND', message: 'nope' }), host);
    expect(res.status).toHaveBeenCalledWith(404);
    const body = json.mock.calls[0][0];
    expect(body).toMatchObject({ statusCode: 404, error: { code: 'NOT_FOUND', message: 'nope' }, path: '/api/v1/x' });
    expect(typeof body.requestId).toBe('string');
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', body.requestId);
    expect(new Date(body.timestamp).toString()).not.toBe('Invalid Date');
  });
});
