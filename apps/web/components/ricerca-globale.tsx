'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cercaNellIndice, type TipoVoce, type VoceIndice } from '@/lib/mock/indice';

/**
 * Ricerca globale — una sola barra per clienti, fatture, documenti,
 * articoli, appuntamenti, memoria del Brain e automazioni.
 *
 * Due scelte che la rendono parte dell'ecosistema invece di una pagina
 * in più (brief V8: "un'unica intelligenza, non pagine diverse"):
 *
 * 1. Usa lo STESSO indice dello strumento `cerca` della conversazione:
 *    ciò che AIOS trova da sé e ciò che trovi tu non possono divergere.
 * 2. L'ultima riga è sempre "Chiedi ad AIOS": quando la ricerca per
 *    parole non basta — ed è il caso di ogni domanda vera, tipo "chi
 *    devo chiamare oggi" — passi la palla alla conversazione senza
 *    riscrivere niente. Se non ci sono risultati, quella riga non è un
 *    fallimento: è la risposta giusta.
 *
 * Aperta con ⌘K / Ctrl+K su desktop e con la lente in alto su telefono
 * (dove la scorciatoia non esiste).
 */

const ETICHETTE: Record<TipoVoce, string> = {
  cliente: 'CLIENTI',
  fattura: 'FATTURE',
  documento: 'DOCUMENTI',
  articolo: 'MAGAZZINO',
  appuntamento: 'AGENDA',
  memoria: 'MEMORIA DEL BRAIN',
  automazione: 'AUTOMAZIONI',
};

const ORDINE: readonly TipoVoce[] = [
  'cliente',
  'fattura',
  'documento',
  'articolo',
  'appuntamento',
  'memoria',
  'automazione',
];

function percorso(voce: VoceIndice): string {
  if (voce.href) return voce.href;
  return voce.spazio === 'brain' ? '/brain' : `/spazi/${voce.spazio}`;
}

export function RicercaGlobale() {
  const router = useRouter();
  const [aperta, setAperta] = useState(false);
  const [query, setQuery] = useState('');
  const [selezione, setSelezione] = useState(0);
  const campo = useRef<HTMLInputElement | null>(null);

  const risultati = useMemo(
    () => (query.trim().length > 1 ? cercaNellIndice(query, 10) : []),
    [query],
  );

  // Le voci navigabili: i risultati, e in fondo sempre "Chiedi ad AIOS".
  const totale = risultati.length + (query.trim().length > 0 ? 1 : 0);
  const indiceChiedi = risultati.length;

  const chiudi = useCallback(() => {
    setAperta(false);
    setQuery('');
    setSelezione(0);
  }, []);

  useEffect(() => {
    function scorciatoia(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAperta((v) => !v);
      }
    }
    window.addEventListener('keydown', scorciatoia);
    return () => window.removeEventListener('keydown', scorciatoia);
  }, []);

  useEffect(() => {
    if (aperta) campo.current?.focus();
  }, [aperta]);

  useEffect(() => setSelezione(0), [query]);

  function chiediAdAios(domanda: string) {
    chiudi();
    // La conversazione è già onnipresente: le passo la domanda invece di
    // costruire una seconda esperienza di risposta.
    window.dispatchEvent(new CustomEvent<string>('aios-chiedi', { detail: domanda }));
  }

  function apriVoce(voce: VoceIndice) {
    chiudi();
    router.push(percorso(voce));
  }

  function conferma() {
    if (selezione === indiceChiedi) {
      const domanda = query.trim();
      if (domanda) chiediAdAios(domanda);
      return;
    }
    const voce = risultati[selezione];
    if (voce) apriVoce(voce);
  }

  function tasti(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      chiudi();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (totale > 0) setSelezione((s) => (s + 1) % totale);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (totale > 0) setSelezione((s) => (s - 1 + totale) % totale);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      conferma();
    }
  }

  // Raggruppo per tipo mantenendo l'indice piatto per la tastiera.
  const gruppi = ORDINE.map((tipo) => ({
    tipo,
    voci: risultati
      .map((v, i) => ({ v, i }))
      .filter((r) => r.v.tipo === tipo),
  })).filter((g) => g.voci.length > 0);

  return (
    <>
      <button
        type="button"
        className="apri-ricerca"
        onClick={() => setAperta(true)}
        aria-label="Cerca in tutta l'azienda"
      >
        <span aria-hidden="true">⌕</span>
        <span className="kbd-ricerca">⌘K</span>
      </button>

      {aperta ? (
        <div className="velo-ricerca" role="presentation" onClick={chiudi}>
          <div
            className="ricerca"
            role="dialog"
            aria-label="Ricerca globale"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ricerca-campo">
              <span className="lente" aria-hidden="true">
                ⌕
              </span>
              <input
                ref={campo}
                type="text"
                value={query}
                placeholder="Cerca un cliente, una fattura, un documento… o chiedimelo"
                aria-label="Cerca in tutta l'azienda"
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={tasti}
              />
              <button type="button" className="chiudi-ricerca" onClick={chiudi} aria-label="Chiudi">
                esc
              </button>
            </div>

            <div className="ricerca-esiti">
              {query.trim().length === 0 ? (
                <p className="ricerca-vuota">
                  Cerca qualunque cosa in azienda. Oppure scrivi una domanda vera — a quella
                  rispondo io.
                </p>
              ) : null}

              {gruppi.map((g) => (
                <div className="gruppo" key={g.tipo}>
                  <div className="gruppo-titolo">{ETICHETTE[g.tipo]}</div>
                  {g.voci.map(({ v, i }) => (
                    <button
                      type="button"
                      key={v.titolo}
                      className={i === selezione ? 'esito scelto' : 'esito'}
                      onMouseEnter={() => setSelezione(i)}
                      onClick={() => apriVoce(v)}
                    >
                      <span className="esito-titolo">{v.titolo}</span>
                      <span className="esito-dettaglio">{v.dettaglio}</span>
                    </button>
                  ))}
                </div>
              ))}

              {query.trim().length > 0 ? (
                <div className="gruppo">
                  <div className="gruppo-titolo">
                    {risultati.length === 0 ? 'NESSUNA CORRISPONDENZA — MA POSSO RAGIONARCI' : 'OPPURE'}
                  </div>
                  <button
                    type="button"
                    className={selezione === indiceChiedi ? 'esito scelto chiedi' : 'esito chiedi'}
                    onMouseEnter={() => setSelezione(indiceChiedi)}
                    onClick={() => chiediAdAios(query.trim())}
                  >
                    <span className="esito-titolo">Chiedi ad AIOS: «{query.trim()}»</span>
                    <span className="esito-dettaglio">
                      Cerco da solo quello che serve e ti rispondo — e se va fatto qualcosa, te lo
                      propongo
                    </span>
                  </button>
                </div>
              ) : null}
            </div>

            <div className="ricerca-piede">
              <span>↑↓ per scegliere</span>
              <span>↵ per aprire</span>
              <span>esc per chiudere</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
