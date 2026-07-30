'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CRITERIO,
  INTERRUZIONI,
  SILENZIATI,
  TOTALE_SILENZIATE,
} from '@/lib/mock/notifiche';

/**
 * Centro notifiche — costruito al rovescio rispetto al solito.
 *
 * La campanella mostra un numero solo se qualcosa richiede davvero te.
 * Dentro, la prima cosa che leggi è quante cose AIOS ha taciuto e con
 * quale regola: è il modo di rendere visibile la promessa "ti disturbo
 * solo quando serve" invece di limitarsi a dichiararla.
 */
export function Notifiche() {
  const [aperto, setAperto] = useState(false);
  const [ignorate, setIgnorate] = useState<readonly string[]>([]);
  const [imparate, setImparate] = useState<readonly string[]>([]);

  useEffect(() => {
    function esc(e: KeyboardEvent) {
      if (e.key === 'Escape') setAperto(false);
    }
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  const vive = INTERRUZIONI.filter((i) => !ignorate.includes(i.id));

  return (
    <>
      <button
        type="button"
        className="apri-notifiche"
        onClick={() => setAperto(true)}
        aria-label={
          vive.length === 0
            ? 'Notifiche — niente che richieda te'
            : `Notifiche — ${vive.length} richiedono te`
        }
      >
        <span aria-hidden="true">◔</span>
        {vive.length > 0 ? <span className="pallino-notifiche">{vive.length}</span> : null}
      </button>

      {aperto ? (
        <div className="velo-ricerca aperto" role="presentation" onClick={() => setAperto(false)}>
          <div
            className="ricerca pannello-notifiche"
            role="dialog"
            aria-label="Notifiche"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ricerca-campo">
              <span className="lente" aria-hidden="true">
                ◔
              </span>
              <div className="notifiche-testa">
                <div className="notifiche-titolo">
                  Ti ho interrotto {vive.length} volte oggi.
                </div>
                <div className="notifiche-sotto">
                  Ho taciuto {TOTALE_SILENZIATE} altre cose. Qui sotto trovi anche quelle, con il
                  motivo.
                </div>
              </div>
              <button
                type="button"
                className="chiudi-ricerca"
                onClick={() => setAperto(false)}
                aria-label="Chiudi"
              >
                esc
              </button>
            </div>

            <div className="ricerca-esiti">
              <div className="gruppo">
                <div className="gruppo-titolo">PER QUESTE TI HO CHIAMATO</div>
                {vive.length === 0 ? (
                  <p className="ricerca-vuota">
                    Niente che richieda te adesso. Continuo a lavorare e ti chiamo se cambia
                    qualcosa.
                  </p>
                ) : null}
                {vive.map((i) => (
                  <div className="notifica" key={i.id}>
                    <div className="notifica-quando">{i.quando}</div>
                    <div className="notifica-cosa">{i.cosa}</div>
                    <p className="notifica-perche">
                      <span className="notifica-etichetta">PERCHÉ ADESSO</span>
                      {i.percheAdesso}
                    </p>
                    {i.confidenza ? <span className="conf">{i.confidenza}</span> : null}
                    <div className="notifica-azioni">
                      {i.href ? (
                        <Link href={i.href} className="pillola" onClick={() => setAperto(false)}>
                          Vedi
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        className="pillola"
                        onClick={() => {
                          setIgnorate((v) => [...v, i.id]);
                          setImparate((v) => [...v, i.id]);
                        }}
                      >
                        Non chiamarmi per questo
                      </button>
                    </div>
                    {imparate.includes(i.id) ? (
                      <div className="imparato-chip">
                        ✓ IMPARATO — NON TI INTERROMPERÒ PIÙ PER CASI COME QUESTO
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="gruppo">
                <div className="gruppo-titolo">
                  QUESTE LE HO GESTITE IO — {TOTALE_SILENZIATE} COSE
                </div>
                {SILENZIATI.map((g) => (
                  <div className="silenziato" key={g.cosa}>
                    <div className="silenziato-testa">
                      <span className="silenziato-quante">{g.quante}</span>
                      <span className="silenziato-cosa">{g.cosa}</span>
                      <span className="stato auto">{g.regola}</span>
                    </div>
                    <p className="silenziato-perche">{g.percheTaciuto}</p>
                  </div>
                ))}
              </div>

              <div className="gruppo">
                <div className="gruppo-titolo">COME DECIDO SE CHIAMARTI</div>
                <div className="criterio">
                  <div className="criterio-blocco">
                    <span className="criterio-etichetta">TI CHIAMO SE</span>
                    <ul>
                      {CRITERIO.interrompo.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="criterio-blocco">
                    <span className="criterio-etichetta">NON TI CHIAMO SE</span>
                    <ul>
                      {CRITERIO.nonInterrompo.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="criterio-tetto">
                    <b>
                      Tetto: {CRITERIO.tetto.quante} interruzioni al giorno · oggi{' '}
                      {CRITERIO.tetto.usate} usate.
                    </b>{' '}
                    {CRITERIO.tetto.nota}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
