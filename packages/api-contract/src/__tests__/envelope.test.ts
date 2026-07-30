import { describe, it, expect } from 'vitest';
import { successEnvelope, errorEnvelope, ErrorCodes } from '../envelope';

const baseMeta = {
  request_id: 'req_test',
  correlation_id: 'corr_test',
  trace_id: 'trace_test',
  version: 'v1',
};

describe('successEnvelope', () => {
  it('popola data e lascia error a null', () => {
    const envelope = successEnvelope({ id: '123' }, baseMeta);
    expect(envelope.data).toEqual({ id: '123' });
    expect(envelope.error).toBeNull();
  });

  it('genera un timestamp ISO 8601 valido', () => {
    const envelope = successEnvelope({}, baseMeta);
    expect(() => new Date(envelope.meta.timestamp).toISOString()).not.toThrow();
    expect(envelope.meta.timestamp.endsWith('Z')).toBe(true);
  });

  it('include pagination solo se esplicitamente fornita', () => {
    const withoutPagination = successEnvelope({}, baseMeta);
    expect(withoutPagination.pagination).toBeNull();

    const pagination = { cursor: null, next_cursor: 'abc', has_more: true, limit: 50 };
    const withPagination = successEnvelope({}, baseMeta, pagination);
    expect(withPagination.pagination).toEqual(pagination);
  });
});

describe('errorEnvelope', () => {
  it('popola error e lascia data a null', () => {
    const envelope = errorEnvelope(
      {
        code: ErrorCodes.INVALID_CREDENTIALS,
        message_user: 'Credenziali non valide.',
        message_technical: 'Password hash mismatch',
        severity: 'warning',
        retryable: false,
        suggestion: null,
        trace_id: 'trace_test',
      },
      baseMeta,
    );
    expect(envelope.data).toBeNull();
    expect(envelope.error?.code).toBe('INVALID_CREDENTIALS');
  });

  it('non popola mai data ed error insieme (invariante dell\'envelope)', () => {
    const success = successEnvelope({ ok: true }, baseMeta);
    const failure = errorEnvelope(
      {
        code: ErrorCodes.NOT_FOUND,
        message_user: 'Non trovato.',
        message_technical: 'Resource not found',
        severity: 'info',
        retryable: false,
        suggestion: null,
        trace_id: 'trace_test',
      },
      baseMeta,
    );

    expect(success.data !== null && success.error === null).toBe(true);
    expect(failure.data === null && failure.error !== null).toBe(true);
  });
});
