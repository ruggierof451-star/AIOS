'use client';

import { useState } from 'react';
import { Puntino } from './puntino';
import type { DecisioneSpazio } from '@/lib/mock/spazi';

/**
 * Il pattern ricorrente del prodotto: AIOS propone → tu approvi → AIOS
 * esegue e continua a seguire. Include il "perché" con la confidenza e
 * l'apprendimento visibile quando correggi il tono.
 */
export function Decisione({
  decisione,
  indice,
}: {
  decisione: DecisioneSpazio;
  indice: number;
}) {
  const [aperta, setAperta] = useState(false);
  const [deciso, setDeciso] = useState(false);
  const [inviato, setInviato] = useState(false);

  const idPerche = `perche-${indice}`;

  if (inviato) {
    return (
      <div className="dialogo">
        <div className="chi">
          <Puntino />
          AIOS
        </div>
        <div className="esito-invio">
          <b>Fatto.</b> Tengo d&rsquo;occhio come va e ti aggiorno io — se non si muove
          niente, ti propongo il passo successivo.
        </div>
      </div>
    );
  }

  return (
    <div className="dialogo">
      <div className="chi">
        <Puntino />
        AIOS
      </div>
      <div className="parola">
        {decisione.parola}
        <button
          type="button"
          className="perche-btn"
          aria-expanded={aperta}
          aria-controls={idPerche}
          onClick={() => setAperta((v) => !v)}
        >
          perché lo propongo
        </button>
      </div>
      <div id={idPerche} className={aperta ? 'spiega aperta' : 'spiega'}>
        {decisione.perche}
        {decisione.confidenza ? <span className="conf">{decisione.confidenza}</span> : null}
      </div>

      {decisione.bozza ? (
        <div className="bozza">{deciso ? decisione.bozzaDecisa : decisione.bozza}</div>
      ) : null}

      <div className="risposte">
        {decisione.risposte.map((r, i) => {
          const rendeDeciso = r.toLowerCase().includes('deciso');
          if (rendeDeciso && deciso) return null;
          return (
            <button
              key={r}
              type="button"
              className={i === 0 ? 'pillola primaria' : 'pillola'}
              onClick={() => {
                if (rendeDeciso) setDeciso(true);
                else if (i === 0) setInviato(true);
              }}
            >
              {r}
            </button>
          );
        })}
      </div>

      {deciso ? (
        <div className="imparato-chip">✓ IMPARATO — PREFERISCI UN TONO PIÙ DIRETTO QUI</div>
      ) : null}
    </div>
  );
}
