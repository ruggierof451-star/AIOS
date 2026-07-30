'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { accedi, chiSono, passwordValida, REGOLA_PASSWORD, registra } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';

/**
 * ACCESSO — collegata alle API REALI (Identity, via Gateway).
 * Prerequisito: backend avviato in locale (pnpm dev alla radice del
 * monorepo). Vedi apps/web/README.md.
 */
export default function PaginaAccesso() {
  const router = useRouter();
  const [modo, setModo] = useState<'accedi' | 'crea'>('accedi');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  async function invia(e: FormEvent) {
    e.preventDefault();
    setErrore(null);

    if (modo === 'crea' && !passwordValida(password)) {
      setErrore(`La password non rispetta i requisiti. ${REGOLA_PASSWORD.descrizione}`);
      return;
    }

    setInCorso(true);
    try {
      if (modo === 'accedi') {
        await accedi(email, password);
      } else {
        // `register` non rilascia token: `registra` concatena la chiamata
        // a `token` con le stesse credenziali.
        await registra(email, password);
      }

      // Verifica che il token salvato sia davvero accettato: distingue
      // "login riuscito" da "token ricevuto ma non funzionante".
      await chiSono();

      router.push(modo === 'accedi' ? '/oggi' : '/primo-incontro');
    } catch (err) {
      setErrore(
        err instanceof ApiError ? err.message : 'Qualcosa è andato storto. Riprova tra poco.',
      );
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div className="accesso">
      <div className="logo">
        AI<span>OS</span>
      </div>
      <div className="scheda">
        <h1>{modo === 'accedi' ? 'Bentornato.' : 'Iniziamo.'}</h1>
        <p className="sotto">
          {modo === 'accedi'
            ? 'Riprendiamo da dove eravamo rimasti.'
            : 'Crea il tuo accesso — poi ci presentiamo con calma.'}
        </p>
        <form onSubmit={invia}>
          <div className="campo">
            <label htmlFor="email">EMAIL</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="campo">
            <label htmlFor="password">PASSWORD</label>
            <input
              id="password"
              type="password"
              autoComplete={modo === 'accedi' ? 'current-password' : 'new-password'}
              required
              minLength={modo === 'crea' ? REGOLA_PASSWORD.lunghezzaMinima : 1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {modo === 'crea' ? (
              <p className="regola-password">{REGOLA_PASSWORD.descrizione}</p>
            ) : null}
          </div>
          <button type="submit" className="invia" disabled={inCorso}>
            {inCorso ? 'Un momento…' : modo === 'accedi' ? 'Entra' : 'Crea il mio accesso'}
          </button>
          {errore ? <p className="errore">{errore}</p> : null}
        </form>
        <p className="cambia-modo">
          {modo === 'accedi' ? 'Prima volta qui?' : 'Hai già un accesso?'}
          <button
            type="button"
            onClick={() => {
              setModo((m) => (m === 'accedi' ? 'crea' : 'accedi'));
              setErrore(null);
            }}
          >
            {modo === 'accedi' ? 'Iniziamo' : 'Entra'}
          </button>
        </p>
      </div>
    </div>
  );
}
