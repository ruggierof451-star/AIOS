'use client';

import { useState } from 'react';
import { Rete } from '@/components/rete';
import { azienda } from '@/lib/mock/dati';

/**
 * LA PLANCIA.
 *
 * Ordine deliberato: prima il pensiero di AIOS su fondo pulito (mai la
 * rete dietro le parole), poi i vitali, poi la rete nel suo pannello,
 * poi l'asse del tempo, poi le situazioni.
 *
 * Mettere a fuoco una situazione cambia tutto insieme: la rete traccia
 * il ragionamento, i vitali non coinvolti si spengono, l'asse sbiadisce
 * ciò che non c'entra. Un solo cervello, non sezioni indipendenti.
 */

interface Situazione {
  readonly grado: string;
  readonly gc: string;
  readonly titolo: string;
  readonly corpo: string;
  readonly azioni: readonly string[];
  readonly catena: readonly string[];
  readonly vitali: readonly string[];
  readonly tag: readonly string[];
}

const SITUAZIONI: readonly Situazione[] = [
  {
    grado: 'ALTA',
    gc: 'alta',
    titolo: 'Il tuo margine si sta erodendo, e so da dove',
    corpo:
      'Metalsud ha alzato il listino del 7%. Di 18 articoli, 11 li rivendi a margine fisso: l\u2019aumento lo assorbi tu, € 340 al mese. Ferro&Co lo recupera su quegli 11.',
    azioni: ['Vedi i conti', 'Consegna di prova', 'Resta con Metalsud'],
    catena: ['catalogo', 'metalsud', 'margine', 'ferro'],
    vitali: ['margine'],
    tag: ['metalsud', 'ferro', 'margine'],
  },
  {
    grado: 'ALTA',
    gc: 'alta',
    titolo: 'Un cliente si sta raffreddando, e non te ne sei accorto',
    corpo:
      'Verdi Logistics ha riaperto il preventivo da € 38.500 quattro volte in due giorni senza rispondere. Confidenza 74%: campione piccolo, e te lo dico invece di nasconderlo.',
    azioni: ['Telefono io', 'Scrivi tu', 'Aspetta'],
    catena: ['verdi', 'preventivo', 'agenda', 'margine'],
    vitali: ['crediti'],
    tag: ['verdi', 'preventivo', 'agenda'],
  },
  {
    grado: 'MEDIA',
    gc: 'media',
    titolo: 'Bellini aspetta una tua decisione, non un sollecito automatico',
    corpo:
      '32 giorni sulla fattura n. 214 — € 6.100. Primo ritardo in due anni, ordini in crescita del 22%. Ho scritto un promemoria cordiale: un tono duro qui costa più del credito.',
    azioni: ['Approva e invia', 'Rendilo più deciso', 'Domani'],
    catena: ['bellini', 'f214', 'cassa'],
    vitali: ['crediti', 'cassa'],
    tag: ['bellini', 'f214', 'cassa'],
  },
];

const VITALI = [
  { id: 'autonomia', n: 'AUTONOMIA', v: '98,4%', d: '+1,2', dc: 'su', p: 98, cl: 'bene' },
  { id: 'cassa', n: 'CASSA 30GG', v: '+€ 12.720', d: '+8%', dc: 'su', p: 72, cl: 'bene' },
  { id: 'crediti', n: 'DA INCASSARE', v: '€ 48.350', d: '3 in ritardo', dc: 'giu', p: 44, cl: 'rischio' },
  { id: 'margine', n: 'MARGINE', v: '27,4%', d: '−0,6', dc: 'giu', p: 52, cl: 'rischio' },
  { id: 'scorte', n: 'SCORTE', v: '6', d: 'sotto soglia', dc: 'giu', p: 30, cl: 'rischio' },
  { id: 'tempo', n: 'TEMPO RESO', v: '6h 40m', d: '7 giorni', dc: 'su', p: 66, cl: 'bene' },
] as const;

const ASSE = [
  { f: 'HO FATTO', cl: '', voci: [
    { o: '09:41', t: 'Incassata Fontana — € 3.900', tag: 'fontana' },
    { o: '09:12', t: 'Riconciliate 14 fatture', tag: 'cassa' },
    { o: '08:47', t: 'Spostata consegna Nervi', tag: 'nervi' },
    { o: '07:02', t: 'Chiesto rimborso Enel', tag: 'enel' },
  ] },
  { f: 'STO FACENDO ORA', cl: 'adesso', voci: [
    { o: 'adesso', t: 'Leggo il catalogo Metalsud · 41/68', tag: 'metalsud' },
    { o: 'adesso', t: 'Confronto i prezzi Ferro&Co', tag: 'ferro' },
    { o: 'adesso', t: 'Osservo Verdi Logistics', tag: 'verdi' },
  ] },
  { f: 'FARÒ', cl: '', voci: [
    { o: '11:00', t: 'Invierò i solleciti approvati', tag: 'bellini' },
    { o: '14:30', t: 'Dossier Nervi pronto', tag: 'nervi' },
    { o: '20 ago', t: 'F24 € 8.240 — la cassa regge', tag: 'f24' },
  ] },
] as const;

export default function PaginaPlancia() {
  const [fuoco, setFuoco] = useState<number | null>(null);
  const attiva = fuoco !== null ? SITUAZIONI[fuoco] : undefined;

  return (
    <>
      {/* Il pensiero, su fondo pulito */}
      <section className="pensiero-blocco">
        <div className="riga-alta">
          <span className="cuore" aria-hidden="true" />
          GIOVEDÌ 30 LUGLIO · 09:52 · 1.204 SEGNALI OSSERVATI
        </div>
        <h1 className="pensiero">
          Buongiorno {azienda.utente}. La tua azienda sta bene, ma{' '}
          <em>una cosa si sta muovendo</em> nella direzione sbagliata, e vale{' '}
          <span className="grad">€ 4.080 all&rsquo;anno</span>.
        </h1>
        <p className="sotto-pensiero">
          Ho letto 1.204 segnali da ieri sera — email, movimenti, giacenze, cataloghi. Di tutto
          questo, tre cose meritano te. Il resto l&rsquo;ho già chiuso.
        </p>
      </section>

      {/* Vitali */}
      <section className="vitali">
        {VITALI.map((v) => {
          const dentro = attiva ? attiva.vitali.includes(v.id) : true;
          return (
            <div
              key={v.id}
              className={`vitale ${v.cl}${attiva && !dentro ? ' spento' : ''}${attiva && dentro ? ' acceso' : ''}`}
            >
              <div className="vitale-nome">{v.n}</div>
              <div className="vitale-v">{v.v}</div>
              <div className={`vitale-d ${v.dc}`}>{v.d}</div>
              <span className="vitale-barra" style={{ width: `${v.p}%` }} />
            </div>
          );
        })}
      </section>

      {/* La rete, nel suo pannello */}
      <Rete catena={attiva?.catena} />

      {/* Asse del tempo */}
      <section className="asse">
        {ASSE.map((f) => (
          <div className={`fascia ${f.cl}`} key={f.f}>
            <div className="fascia-eti">{f.f}</div>
            {f.voci.map((v) => (
              <div
                className={`ev${attiva && !attiva.tag.includes(v.tag) ? ' fuori' : ''}`}
                key={v.t}
              >
                <span className="o">{v.o}</span>
                <span>{v.t}</span>
              </div>
            ))}
          </div>
        ))}
      </section>

      {/* Situazioni */}
      <section className="situazioni">
        <div className="eti-sez">SITUAZIONI CHE STO SEGUENDO</div>
        {SITUAZIONI.map((s, i) => (
          <div
            key={s.titolo}
            className={`sit${fuoco === i ? ' messa' : ''}${fuoco !== null && fuoco !== i ? ' fuori' : ''}`}
            onMouseEnter={() => setFuoco(i)}
            onMouseLeave={() => setFuoco(null)}
          >
            <div className="sit-t">
              <span className={`grado ${s.gc}`}>{s.grado}</span>
              <span className="sit-ti">{s.titolo}</span>
            </div>
            <div className="sit-c">{s.corpo}</div>
            <div className="sit-az">
              {s.azioni.map((a, j) => (
                <button type="button" className={j === 0 ? 'btn primo' : 'btn'} key={a}>
                  {a}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
