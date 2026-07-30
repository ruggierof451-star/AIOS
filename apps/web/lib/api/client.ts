/**
 * Client API unico di tutto il frontend.
 *
 * Regola (dal piano frontend approvato): le pagine non sanno se dietro
 * c'è un mock o un'API vera — parlano solo con questo client. Le forme
 * di richiesta/risposta rispettano l'envelope reale di @aios/api-contract
 * ({ data, error, meta }), così il passaggio mock→reale è configurazione,
 * non riscrittura.
 *
 * Le chiamate vanno alla STESSA origine (/api/...): next.config.mjs le
 * proxa verso il Gateway reale. Niente CORS, niente host hardcoded.
 */

export interface ApiEnvelope<T> {
  data: T | null;
  error: {
    code: string;
    message_user?: string;
    message_technical?: string;
    retryable?: boolean;
  } | null;
  meta?: unknown;
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const CHIAVE_TOKEN = 'aios_token';
const CHIAVE_REFRESH = 'aios_refresh';

export function tokenCorrente(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(CHIAVE_TOKEN);
}

export function salvaToken(token: string): void {
  window.localStorage.setItem(CHIAVE_TOKEN, token);
}

/**
 * Il refresh token viene conservato perché Identity espone già
 * POST /api/v1/auth/refresh. Il rinnovo automatico alla scadenza non è
 * ancora implementato: quando l'access token scade si torna all'accesso.
 * È un limite noto, dichiarato in MOCKS.md.
 */
export function salvaRefreshToken(token: string): void {
  window.localStorage.setItem(CHIAVE_REFRESH, token);
}

export function refreshCorrente(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(CHIAVE_REFRESH);
}

export function dimenticaToken(): void {
  window.localStorage.removeItem(CHIAVE_TOKEN);
  window.localStorage.removeItem(CHIAVE_REFRESH);
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = tokenCorrente();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(path, { ...init, headers });

  let envelope: ApiEnvelope<T> | null = null;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // corpo non JSON (es. Gateway giù): gestito sotto come errore HTTP
  }

  if (!response.ok || !envelope || envelope.error || envelope.data === null) {
    const messaggio =
      envelope?.error?.message_user ??
      `Non riesco a raggiungere il servizio (HTTP ${response.status}). Verifica che il backend sia avviato.`;
    const codice = envelope?.error?.code ?? `HTTP_${response.status}`;
    throw new ApiError(codice, messaggio, response.status);
  }

  return envelope.data;
}
