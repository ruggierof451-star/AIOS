/**
 * Autenticazione — API REALI di Identity, via Gateway.
 *
 * ⚠️ I percorsi e le forme qui sotto sono stati verificati leggendo il
 * controller reale (`backend/services/identity/src/api/auth.controller.ts`)
 * e i casi d'uso, non dedotti. Una versione precedente di questo file
 * chiamava `/api/v1/auth/login`, che non esiste: la rotta è `token`
 * (il metodo del controller si chiama `login`, il percorso no).
 *
 * Rotte esposte da Identity:
 *   POST /api/v1/auth/register  { email, password }        → { userId, email }   201
 *   POST /api/v1/auth/token     { email, password, mfaCode? } → { accessToken, refreshToken, userId } 200
 *   POST /api/v1/auth/refresh   { refreshToken }           → { accessToken, refreshToken, userId } 200
 *   GET  /api/v1/auth/me        (Bearer)                   → { userId, email, mfaEnabled, status }
 */

import { api, salvaToken, salvaRefreshToken } from './client';

/** La registrazione NON restituisce token: solo l'utente creato. */
export interface UtenteRegistrato {
  userId: string;
  email: string;
}

export interface Sessione {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

export interface UtenteCorrente {
  userId: string;
  email: string;
  mfaEnabled: boolean;
  status: 'ACTIVE' | 'SUSPENDED';
}

/** Regola applicata da RegisterUserUseCase: almeno 10 caratteri, con lettere e numeri. */
export const REGOLA_PASSWORD = {
  lunghezzaMinima: 10,
  descrizione: 'Almeno 10 caratteri, con lettere e numeri.',
};

export function passwordValida(password: string): boolean {
  return (
    password.length >= REGOLA_PASSWORD.lunghezzaMinima &&
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

/** POST /api/v1/auth/token — l'unico endpoint che rilascia i token. */
export async function accedi(email: string, password: string): Promise<Sessione> {
  const sessione = await api<Sessione>('/api/v1/auth/token', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  salvaToken(sessione.accessToken);
  salvaRefreshToken(sessione.refreshToken);
  return sessione;
}

/**
 * Registrazione: due chiamate, non una.
 *
 * `register` crea l'utente e restituisce { userId, email } — nessun
 * token. Per entrare serve poi `token` con le stesse credenziali. Prima
 * questo file dava per scontato che la registrazione restituisse un
 * accessToken: salvava `undefined`, e il Primo Incontro rimbalzava
 * all'accesso senza spiegazione.
 */
export async function registra(email: string, password: string): Promise<Sessione> {
  await api<UtenteRegistrato>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return accedi(email, password);
}

/**
 * GET /api/v1/auth/me — verifica che il token salvato sia davvero
 * accettato dal backend. Serve a distinguere "login riuscito" da "token
 * ricevuto ma non funzionante", che altrimenti si scoprirebbe solo alla
 * prima chiamata protetta.
 */
export async function chiSono(): Promise<UtenteCorrente> {
  return api<UtenteCorrente>('/api/v1/auth/me');
}
