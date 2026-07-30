'use client';

import { useEffect, useRef, useState } from 'react';
import { motoreConversazione, type AzioneDaApprovare, type MessaggioConversazione } from '@/lib/conversation/engine';
import { ascolta, ascoltoDisponibile, parla, parlatoDisponibile, zittisci, type SessioneAscolto } from '@/lib/conversation/voce';

/**
 * Il Flusso — la coscienza di AIOS, sempre aperta su schermi larghi.
 *
 * Due cose insieme, ed è voluto: quello che AIOS osserva da solo
 * (battiti che arrivano mentre guardi) e la conversazione vera con lui
 * (stesso motore reale del resto dell'app, non un mock).
 */

interface Battito {
  readonly cl: string;
  readonly testo: string;
  readonly ora?: string;
  readonly forma?: string;
}

const INIZIALI: readonly Battito[] = [
  { cl: 'ok', testo: 'Ho chiuso la fattura 209 di Fontana: € 3.900 incassati.', ora: '09:41' },
  { cl: '', testo: 'Sto leggendo il catalogo Metalsud, pagina 41 di 68.', ora: '09:38' },
  { cl: 'allarme', testo: 'Quarta riapertura del preventivo Verdi: alzo il rischio.', ora: '06:50' },
  { cl: 'attesa', testo: 'Aspetto Enel sul rimborso di € 214.', ora: '07:02' },
];

const OSSERVAZIONI: readonly Battito[] = [
  { cl: 'ok', testo: 'Ho collegato una email di Gialli Retail alla loro scheda.' },
  { cl: '', testo: 'Ricalcolo il margine con i prezzi Ferro&Co: 11 articoli su 18.' },
  { cl: 'allarme', testo: 'Guarnizioni serie B: al ritmo attuale finiscono in 3 giorni.' },
  { cl: 'ok', testo: 'Archiviate 6 bolle, abbinate ai movimenti di magazzino.' },
  { cl: '', testo: 'Bellini ordina di solito il 1º del mese: preparo la disponibilità.' },
  { cl: 'attesa', testo: 'Nervi non ha ancora dato una data per il saldo.' },
];

const SCOPERTE: readonly Battito[] = [
  {
    cl: 'scoperta',
    forma: 'scoperta',
    testo:
      'Ho scoperto una correlazione. Quando le scorte Metalsud finiscono, compri d\u2019urgenza altrove e quel giorno il margine scende del 3%. È successo 4 volte su 4.',
  },
  {
    cl: 'allarme',
    forma: 'idea',
    testo:
      'Ho cambiato idea su Fontana. Prima la trattavo come un ritardo: ora so che i 42 giorni sono il loro ciclo. Undici conferme su undici. Smetto di segnalartelo.',
  },
  {
    cl: 'scoperta',
    forma: 'scoperta',
    testo:
      'Ho trovato un legame nuovo. Le tre volte in cui Verdi ha rallentato, aveva appena ricevuto un preventivo sopra i € 30.000. Sto guardando se è un caso.',
  },
];

export function Flusso() {
  const [aperto, setAperto] = useState(false);
  const [battiti, setBattiti] = useState<readonly Battito[]>(INIZIALI);
  const [conversazione, setConversazione] = useState<readonly { chi: 'io' | 'aios'; testo: string }[]>([]);
  const [storico, setStorico] = useState<readonly MessaggioConversazione[]>([]);
  const [azioni, setAzioni] = useState<readonly AzioneDaApprovare[]>([]);
  const [bozza, setBozza] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [ascoltando, setAscoltando] = useState(false);
  const [vocePronta, setVocePronta] = useState(false);
  const sessione = useRef<SessioneAscolto | null>(null);
  const fine = useRef<HTMLDivElement | null>(null);

  useEffect(() => setVocePronta(ascoltoDisponibile()), []);
  useEffect(() => {
    fine.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [conversazione, inCorso]);

  // La vita: osservazioni ordinarie e, più di rado, scoperte vere.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let i = 0;
    let s = 0;
    const osserva = window.setInterval(() => {
      const o = OSSERVAZIONI[i % OSSERVAZIONI.length];
      i += 1;
      if (o) setBattiti((b) => [o, ...b].slice(0, 16));
    }, 5200);
    const scopri = window.setInterval(() => {
      const sc = SCOPERTE[s % SCOPERTE.length];
      s += 1;
      if (sc) setBattiti((b) => [sc, ...b].slice(0, 16));
    }, 21000);
    return () => {
      window.clearInterval(osserva);
      window.clearInterval(scopri);
    };
  }, []);

  async function invia(domanda: string) {
    const pulita = domanda.trim();
    if (!pulita || inCorso) return;
    const prossimo: MessaggioConversazione[] = [...storico, { role: 'user', content: pulita }];
    setConversazione((c) => [...c, { chi: 'io', testo: pulita }]);
    setStorico(prossimo);
    setBozza('');
    setErrore(null);
    setAzioni([]);
    setInCorso(true);
    try {
      const r = await motoreConversazione.rispondi(prossimo);
      setStorico(r.messaggi);
      setAzioni(r.azioni);
      if (r.testo) {
        setConversazione((c) => [...c, { chi: 'aios', testo: r.testo }]);
        if (parlatoDisponibile() && ascoltando) parla(r.testo);
      }
      r.passi.forEach((p) => setBattiti((b) => [{ cl: '', testo: p }, ...b].slice(0, 16)));
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Non riesco a rispondere adesso.');
    } finally {
      setInCorso(false);
    }
  }

  async function decidi(a: AzioneDaApprovare, esito: 'approvato' | 'rifiutato') {
    if (inCorso) return;
    setAzioni([]);
    setInCorso(true);
    setConversazione((c) => [...c, { chi: 'io', testo: esito === 'approvato' ? 'Approvo.' : 'No.' }]);
    try {
      const r = await motoreConversazione.rispondi(storico, { id: a.id, esito });
      setStorico(r.messaggi);
      setAzioni(r.azioni);
      if (r.testo) setConversazione((c) => [...c, { chi: 'aios', testo: r.testo }]);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Non riesco a completare.');
    } finally {
      setInCorso(false);
    }
  }

  function commutaAscolto() {
    if (ascoltando) {
      sessione.current?.ferma();
      return;
    }
    zittisci();
    setAscoltando(true);
    sessione.current = ascolta({
      onParziale: (t) => setBozza(t),
      onFinale: (t) => void invia(t),
      onErrore: (m) => {
        setErrore(m);
        setAscoltando(false);
      },
      onFine: () => {
        setAscoltando(false);
        sessione.current = null;
      },
    });
    if (!sessione.current) setAscoltando(false);
  }

  return (
    <>
      <button type="button" className="apri-flusso" onClick={() => setAperto(true)}>
        <span className="onde" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        FLUSSO
      </button>

      <aside className={aperto ? 'flusso aperto' : 'flusso'} aria-label="Flusso di AIOS">
        <div className="flusso-t">
          <span className="onde" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="flusso-ti">FLUSSO</span>
          <button type="button" className="flusso-x" onClick={() => setAperto(false)} aria-label="Chiudi">
            ✕
          </button>
        </div>

        <div className="flusso-c">
          {conversazione.map((m, i) => (
            <div key={`c-${i}`} className={m.chi === 'io' ? 'bolla io' : 'bolla aios'}>
              {m.testo}
            </div>
          ))}

          {azioni.map((a) => (
            <div className="coda-v azione" key={a.id}>
              <b>Serve il tuo ok</b>
              <span>{a.riepilogo}</span>
              <div className="sit-az">
                <button type="button" className="btn primo" disabled={inCorso} onClick={() => void decidi(a, 'approvato')}>
                  Approva
                </button>
                <button type="button" className="btn" disabled={inCorso} onClick={() => void decidi(a, 'rifiutato')}>
                  Non farlo
                </button>
              </div>
            </div>
          ))}

          {inCorso ? <div className="bolla aios attesa">Sto lavorando…</div> : null}
          {errore ? <div className="bolla errore">{errore}</div> : null}

          {battiti.map((b, i) => (
            <div key={`b-${i}-${b.testo.slice(0, 12)}`} className={`bat${b.forma ? ' ' + b.forma : ''}`}>
              <span className={`bat-p ${b.cl}`} aria-hidden="true" />
              <span className="bat-t">
                {b.testo}
                <span className="bat-o">{b.ora ?? 'adesso'}</span>
              </span>
            </div>
          ))}
          <div ref={fine} />
        </div>

        <div className="scrivi">
          <input
            type="text"
            value={bozza}
            placeholder="Dimmi…"
            aria-label="Scrivi ad AIOS"
            onChange={(e) => setBozza(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void invia(bozza);
            }}
          />
          {vocePronta ? (
            <button
              type="button"
              className={ascoltando ? 'mini ascolta' : 'mini'}
              onClick={commutaAscolto}
              aria-label="Parla ad AIOS"
            >
              🎤
            </button>
          ) : null}
          <button
            type="button"
            className="mini pieno"
            disabled={inCorso || bozza.trim().length === 0}
            onClick={() => void invia(bozza)}
            aria-label="Invia"
          >
            ↑
          </button>
        </div>
      </aside>
    </>
  );
}
