/**
 * Indice interrogabile dell'azienda — DATI SIMULATI (vedi MOCKS.md).
 *
 * Serve due funzioni diverse con la stessa fonte: la ricerca globale
 * (⌘K) e lo strumento `cerca` che AIOS usa da sé durante una
 * conversazione. Un solo indice, così i due non divergono mai.
 *
 * Quando i moduli avranno API reali, questo file diventa un adattatore
 * verso il Business Brain: cambia la fonte, non i chiamanti.
 */

export type TipoVoce =
  | 'cliente'
  | 'fattura'
  | 'documento'
  | 'articolo'
  | 'appuntamento'
  | 'memoria'
  | 'automazione';

export interface VoceIndice {
  readonly tipo: TipoVoce;
  readonly titolo: string;
  readonly dettaglio: string;
  readonly spazio: string;
  readonly parole?: readonly string[];
  /** Destinazione precisa, quando esiste una pagina dedicata. */
  readonly href?: string;
}

export const INDICE: readonly VoceIndice[] = [
  // ── Clienti ────────────────────────────────────────────────────────
  { tipo: 'cliente', titolo: 'Ferramenta Bellini', spazio: 'clienti', href: '/clienti/bellini',
    dettaglio: 'Cliente dal 2024 · 18 ordini · sempre puntuale fino alla n. 214 · affidabilità alta',
    parole: ['bellini', 'ferramenta', 'sollecito'] },
  { tipo: 'cliente', titolo: 'Ceramiche Fontana', spazio: 'clienti', href: '/clienti/fontana',
    dettaglio: 'Cliente dal 2022 · paga tra 40 e 45 giorni (regola imparata) · nessun insoluto',
    parole: ['fontana', 'ceramiche'] },
  { tipo: 'cliente', titolo: 'Cantiere Nervi', spazio: 'clienti', href: '/clienti/nervi',
    dettaglio: 'Decide solo dopo sopralluogo · saldo n. 218 in attesa · consegna spostata a giovedì',
    parole: ['nervi', 'cantiere'] },
  { tipo: 'cliente', titolo: 'Verdi Logistics', spazio: 'clienti', href: '/clienti/verdi-logistics',
    dettaglio: 'Trattativa aperta € 38.500 · preventivo riaperto 4 volte senza risposta · rischio alto',
    parole: ['verdi', 'logistics', 'capannone'] },
  { tipo: 'cliente', titolo: 'Bianchi & Co', spazio: 'clienti',
    dettaglio: 'Rinnovo annuale € 18.000 a settembre · contratto con rinnovo tacito',
    parole: ['bianchi'] },
  { tipo: 'cliente', titolo: 'Gialli Retail', spazio: 'clienti',
    dettaglio: 'Manutenzione € 5.900 in attesa di delibera · fattura n. 221 in scadenza',
    parole: ['gialli', 'retail'] },

  // ── Fatture ────────────────────────────────────────────────────────
  { tipo: 'fattura', titolo: 'Fattura n. 214 — Ferramenta Bellini', spazio: 'finanza',
    dettaglio: '€ 6.100 · scaduta da 32 giorni · sollecito cordiale pronto, aspetta approvazione',
    parole: ['214', 'bellini', 'scaduta', 'sollecito'] },
  { tipo: 'fattura', titolo: 'Fattura n. 218 — Cantiere Nervi', spazio: 'finanza',
    dettaglio: '€ 12.400 · saldo lavori · ho chiesto conferma della data di pagamento',
    parole: ['218', 'nervi', 'saldo'] },
  { tipo: 'fattura', titolo: 'Fattura n. 221 — Gialli Retail', spazio: 'finanza',
    dettaglio: '€ 4.850 · in scadenza tra 6 giorni · nel termine',
    parole: ['221', 'gialli'] },
  { tipo: 'fattura', titolo: 'Fattura n. 224 — Ceramiche Fontana', spazio: 'finanza',
    dettaglio: '€ 5.200 · 42 giorni · nella loro normalità, non la segnalo',
    parole: ['224', 'fontana'] },
  { tipo: 'fattura', titolo: 'Fattura n. 226 — Verdi Logistics', spazio: 'finanza',
    dettaglio: '€ 19.800 · pagamento a 60 giorni concordato',
    parole: ['226', 'verdi'] },
  { tipo: 'fattura', titolo: 'Fattura n. 209 — Ceramiche Fontana', spazio: 'finanza',
    dettaglio: '€ 3.900 · saldata e registrata alle 09:41 di oggi',
    parole: ['209', 'fontana', 'pagata', 'incassata'] },
  { tipo: 'fattura', titolo: 'F24 di agosto', spazio: 'finanza',
    dettaglio: '€ 8.240 · scade il 20 agosto · la cassa regge, verificato',
    parole: ['f24', 'tasse', 'fiscale'] },

  // ── Documenti ──────────────────────────────────────────────────────
  { tipo: 'documento', titolo: 'Contratto manutenzione — Bianchi & Co', spazio: 'documenti',
    dettaglio: 'Scade il 14 settembre · rinnovo tacito se non disdetto 30 giorni prima · ti avviso il 10/08',
    parole: ['contratto', 'bianchi', 'manutenzione', 'rinnovo'] },
  { tipo: 'documento', titolo: 'Polizza responsabilità civile', spazio: 'documenti',
    dettaglio: 'Scade il 30 settembre · premio dell\u2019anno scorso recuperato per confronto',
    parole: ['polizza', 'assicurazione', 'rc'] },
  { tipo: 'documento', titolo: 'Catalogo Metalsud 2026', spazio: 'documenti',
    dettaglio: 'In lettura, pagina 41 di 68 · listino +7% su 18 articoli rivenduti',
    parole: ['metalsud', 'catalogo', 'listino'] },
  { tipo: 'documento', titolo: 'Documento non classificato', spazio: 'documenti',
    dettaglio: 'Arrivato ieri, senza riferimenti · lasciato a Fabio: non tiro a indovinare',
    parole: ['non classificato', 'sconosciuto'] },

  // ── Magazzino ──────────────────────────────────────────────────────
  { tipo: 'articolo', titolo: 'Valvola termostatica 3/4', spazio: 'magazzino',
    dettaglio: '4 pezzi · minimo 15 · consumo 12/settimana · rottura stock stimata in 3 giorni',
    parole: ['valvola', 'termostatica'] },
  { tipo: 'articolo', titolo: 'Tubo multistrato 20mm', spazio: 'magazzino',
    dettaglio: '30 m · minimo 120 m · critico',
    parole: ['tubo', 'multistrato'] },
  { tipo: 'articolo', titolo: 'Raccordo 40mm', spazio: 'magazzino',
    dettaglio: '6 pezzi · 80 in arrivo giovedì · escluso dal riordino per non fermare capitale',
    parole: ['raccordo'] },
  { tipo: 'articolo', titolo: 'Lotto #4471 — sigillanti', spazio: 'magazzino',
    dettaglio: 'Scade tra 12 giorni · valore € 640 · da usare',
    parole: ['lotto', '4471', 'sigillanti', 'scadenza'] },

  // ── Calendario ─────────────────────────────────────────────────────
  { tipo: 'appuntamento', titolo: 'Sopralluogo Cantiere Nervi', spazio: 'calendario',
    dettaglio: 'Oggi 14:30 · storico ordini e condizioni già preparati',
    parole: ['sopralluogo', 'nervi'] },
  { tipo: 'appuntamento', titolo: 'Preventivo Nervi — tempo protetto', spazio: 'calendario',
    dettaglio: 'Venerdì 09:00–11:00 · ho spostato una call non urgente a lunedì per liberarlo',
    parole: ['preventivo', 'venerdì', 'protetto'] },
  { tipo: 'appuntamento', titolo: 'Riepilogo settimanale ai soci', spazio: 'calendario',
    dettaglio: 'Oggi 15:00 · lo preparo io per Fabio e Pier',
    parole: ['riepilogo', 'soci', 'pier'] },

  // ── Memoria del Brain ──────────────────────────────────────────────
  { tipo: 'memoria', titolo: 'Fontana paga tra 40 e 45 giorni', spazio: 'brain',
    dettaglio: 'Imparato il 14 luglio · 11 conferme su 11 · confidenza 94% · oltre 50 giorni torno a segnalarlo',
    parole: ['fontana', 'imparato', 'pagamenti'] },
  { tipo: 'memoria', titolo: 'Il giovedì arrivano il 30% di ordini in più', spazio: 'brain',
    dettaglio: 'Imparato il 2 luglio · 8 conferme · preparo le conferme il mercoledì sera',
    parole: ['giovedì', 'ordini', 'imparato'] },
  { tipo: 'memoria', titolo: 'Preventivi sopra € 5.000 li firma Fabio', spazio: 'brain',
    dettaglio: 'Regola di Fabio del 26 giugno · non li invio mai in autonomia',
    parole: ['preventivi', 'regola', 'firma'] },
  { tipo: 'memoria', titolo: 'Sotto € 500 agisco e informo dopo', spazio: 'brain',
    dettaglio: 'Regola di Fabio · è la regola che mi ha fatto agire sul rimborso Enel',
    parole: ['regola', 'autonomia', 'enel'] },

  // ── Automazioni ────────────────────────────────────────────────────
  { tipo: 'automazione', titolo: 'Riconciliazione bancaria quotidiana', spazio: 'brain',
    dettaglio: 'Autonoma · gira ogni mattina alle 09:00 · 14 fatture riconciliate oggi',
    parole: ['riconciliazione', 'banca', 'automazione'] },
  { tipo: 'automazione', titolo: 'Solleciti di pagamento', spazio: 'brain',
    dettaglio: 'Con approvazione · mai inviati senza il tuo ok',
    parole: ['solleciti', 'automazione'] },
  { tipo: 'automazione', titolo: 'Riordino sotto scorta minima', spazio: 'brain',
    dettaglio: 'Con approvazione · proposta pronta: € 3.180 su 5 articoli',
    parole: ['riordino', 'scorta', 'automazione'] },
];

function normalizza(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Ricerca semplice ma onesta: parole tutte presenti in titolo/dettaglio/alias. */
export function cercaNellIndice(query: string, limite = 8): readonly VoceIndice[] {
  const termini = normalizza(query).split(/\s+/).filter((t) => t.length > 1);
  if (termini.length === 0) return [];

  const punteggi = INDICE.map((voce) => {
    const testo = normalizza(
      `${voce.titolo} ${voce.dettaglio} ${(voce.parole ?? []).join(' ')} ${voce.tipo}`,
    );
    const trovati = termini.filter((t) => testo.includes(t));
    if (trovati.length === 0) return { voce, punti: 0 };
    // Un termine nel titolo pesa più di uno nel dettaglio.
    const nelTitolo = termini.filter((t) => normalizza(voce.titolo).includes(t)).length;
    return { voce, punti: trovati.length * 10 + nelTitolo * 5 };
  })
    .filter((r) => r.punti > 0)
    .sort((a, b) => b.punti - a.punti);

  return punteggi.slice(0, limite).map((r) => r.voce);
}
