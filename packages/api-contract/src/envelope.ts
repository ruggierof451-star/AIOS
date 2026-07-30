/**
 * Envelope di risposta unico (API Contract, Engineering Bible Modulo 2,
 * sezione 1.3). Ogni endpoint di ogni servizio deve rispondere con questa
 * struttura, senza eccezioni — è il contratto più trasversale di tutta
 * la piattaforma.
 */

export interface ResponseMeta {
  request_id: string;
  correlation_id: string;
  trace_id: string;
  version: string;
  timestamp: string; // ISO 8601 UTC (API Contract, sez. 4.1)
}

export interface PaginationMeta {
  cursor: string | null;
  next_cursor: string | null;
  has_more: boolean;
  limit: number;
}

export interface ApiError {
  code: string;
  message_user: string;
  message_technical: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  retryable: boolean;
  suggestion: string | null;
  trace_id: string;
}

export interface ApiEnvelope<T> {
  data: T | null;
  meta: ResponseMeta;
  pagination: PaginationMeta | null;
  error: ApiError | null;
}

/**
 * Costruisce una risposta di successo. `data` non è mai null qui — per una
 * risposta senza contenuto (es. 204) non si usa questo envelope, si risponde
 * senza corpo, coerente con l'uso disciplinato dei codici HTTP (API Contract,
 * sez. 1.5).
 */
export function successEnvelope<T>(
  data: T,
  meta: Omit<ResponseMeta, 'timestamp'>,
  pagination: PaginationMeta | null = null,
): ApiEnvelope<T> {
  return {
    data,
    meta: { ...meta, timestamp: new Date().toISOString() },
    pagination,
    error: null,
  };
}

/**
 * Costruisce una risposta di errore. `data` è sempre null — mai entrambi
 * `data` ed `error` popolati insieme (API Contract, sez. 1.3).
 */
export function errorEnvelope(
  error: ApiError,
  meta: Omit<ResponseMeta, 'timestamp'>,
): ApiEnvelope<never> {
  return {
    data: null,
    meta: { ...meta, timestamp: new Date().toISOString() },
    pagination: null,
    error,
  };
}

/**
 * Namespace di codici errore stabili (API Contract, sezione 6.3).
 * Mai rinominati: un client può fare branching logico su questi valori.
 */
export const ErrorCodes = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  // Identity
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
  REFRESH_TOKEN_INVALID: 'REFRESH_TOKEN_INVALID',
  REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
  MFA_CODE_INVALID: 'MFA_CODE_INVALID',

  // Administration / RBAC
  AUTONOMY_THRESHOLD_EXCEEDED: 'AUTONOMY_THRESHOLD_EXCEEDED',
  ROLE_NOT_FOUND: 'ROLE_NOT_FOUND',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
