/**
 * Gli strumenti che AIOS può usare durante una conversazione.
 *
 * ══ Il principio che regge tutto ══
 * Due classi, non una:
 *
 *  - LETTURA: AIOS le esegue da sé, subito, senza chiedere. Guardare non
 *    cambia niente, e un collega che chiede permesso per leggere un dato
 *    è un collega inutile.
 *  - AZIONE: cambiano qualcosa nel mondo (un'email inviata, un ordine
 *    fatto). AIOS NON PUÒ eseguirle da sé. Il server si rifiuta di farlo
 *    e restituisce una richiesta di approvazione.
 *
 * Questo rende la Product Constitution un fatto meccanico invece di una
 * promessa scritta nel prompt: anche se il modello decidesse di agire
 * senza chiedere, il server non glielo lascia fare.
 */

import { cercaNellIndice } from '@/lib/mock/indice';

export type ClasseStrumento = 'lettura' | 'azione';

export interface DefinizioneStrumento {
  readonly name: string;
  readonly classe: ClasseStrumento;
  readonly description: string;
  readonly input_schema: {
    readonly type: 'object';
    readonly properties: Record<string, { type: string; description: string; enum?: string[] }>;
    readonly required?: readonly string[];
  };
  /** Riepilogo in italiano mostrato nella conversazione mentre lo usa. */
  readonly riepilogo: (input: Record<string, unknown>) => string;
}

const testo = (v: unknown): string => (typeof v === 'string' ? v : '');

export const STRUMENTI: readonly DefinizioneStrumento[] = [
  // ══════════ LETTURA ══════════
  {
    name: 'cerca',
    classe: 'lettura',
    description:
      "Cerca in tutta l'azienda: clienti, fatture, documenti, articoli di magazzino, appuntamenti, regole imparate, automazioni. Usalo ogni volta che ti serve un dato che non hai già in testa, invece di dire che non lo sai.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Cosa cercare, in parole semplici' },
      },
      required: ['query'],
    },
    riepilogo: (i) => `Ho cercato "${testo(i.query)}" in azienda`,
  },
  {
    name: 'scheda_cliente',
    classe: 'lettura',
    description:
      'Apre la scheda completa di un cliente: storico, pagamenti, affidabilità, trattative aperte e cosa ho imparato su di lui.',
    input_schema: {
      type: 'object',
      properties: {
        nome: { type: 'string', description: 'Nome del cliente' },
      },
      required: ['nome'],
    },
    riepilogo: (i) => `Ho aperto la scheda di ${testo(i.nome)}`,
  },

  // ══════════ AZIONE — mai eseguite senza approvazione ══════════
  {
    name: 'invia_sollecito',
    classe: 'azione',
    description:
      "Invia un sollecito di pagamento a un cliente. Prima di proporlo, valuta il tono in base allo storico del cliente e spiega perché hai scelto quel tono.",
    input_schema: {
      type: 'object',
      properties: {
        cliente: { type: 'string', description: 'Nome del cliente' },
        fattura: { type: 'string', description: 'Riferimento della fattura, es. "n. 214"' },
        tono: {
          type: 'string',
          description: 'Tono del messaggio',
          enum: ['cordiale', 'diretto', 'formale'],
        },
        testo_messaggio: { type: 'string', description: 'Il testo che verrebbe inviato' },
      },
      required: ['cliente', 'fattura', 'tono', 'testo_messaggio'],
    },
    riepilogo: (i) =>
      `Inviare un sollecito ${testo(i.tono)} a ${testo(i.cliente)} per la fattura ${testo(i.fattura)}`,
  },
  {
    name: 'approva_riordino',
    classe: 'azione',
    description:
      'Manda al fornitore il riordino degli articoli sotto la scorta minima. Escludi sempre gli articoli già in arrivo.',
    input_schema: {
      type: 'object',
      properties: {
        articoli: { type: 'string', description: 'Elenco degli articoli da riordinare' },
        importo: { type: 'string', description: 'Importo totale stimato' },
      },
      required: ['articoli'],
    },
    riepilogo: (i) => `Ordinare al fornitore: ${testo(i.articoli)}`,
  },
  {
    name: 'sposta_appuntamento',
    classe: 'azione',
    description:
      "Sposta un appuntamento in agenda e avvisa chi è coinvolto. Verifica prima che non crei conflitti.",
    input_schema: {
      type: 'object',
      properties: {
        quale: { type: 'string', description: "L'appuntamento da spostare" },
        quando: { type: 'string', description: 'Nuova data e ora' },
        motivo: { type: 'string', description: 'Perché lo stai spostando' },
      },
      required: ['quale', 'quando'],
    },
    riepilogo: (i) => `Spostare "${testo(i.quale)}" a ${testo(i.quando)}`,
  },
  {
    name: 'scrivi_email',
    classe: 'azione',
    description:
      'Scrive e invia una email a un cliente o fornitore. Mostra sempre il testo completo prima di chiedere approvazione.',
    input_schema: {
      type: 'object',
      properties: {
        destinatario: { type: 'string', description: 'A chi va la email' },
        oggetto: { type: 'string', description: 'Oggetto' },
        testo_messaggio: { type: 'string', description: 'Il corpo della email' },
      },
      required: ['destinatario', 'oggetto', 'testo_messaggio'],
    },
    riepilogo: (i) => `Inviare una email a ${testo(i.destinatario)}: "${testo(i.oggetto)}"`,
  },
];

export function strumentoDaNome(nome: string): DefinizioneStrumento | undefined {
  return STRUMENTI.find((s) => s.name === nome);
}

/** Lo schema da passare all'API: la classe è nostra, non la mandiamo. */
export function schemiPerApi(): readonly Record<string, unknown>[] {
  return STRUMENTI.map((s) => ({
    name: s.name,
    description: s.description,
    input_schema: s.input_schema,
  }));
}

/**
 * Esegue uno strumento di LETTURA. Gli strumenti di azione non passano
 * mai da qui: il chiamante deve rifiutarli e chiedere approvazione.
 */
export function eseguiLettura(nome: string, input: Record<string, unknown>): string {
  if (nome === 'cerca') {
    const risultati = cercaNellIndice(testo(input.query));
    if (risultati.length === 0) {
      return 'Nessun risultato in azienda per questa ricerca. Non ho altri archivi collegati: se il dato dovrebbe esserci, dimmi dove lo tenete e lo colleghiamo.';
    }
    return risultati
      .map((r) => `[${r.tipo}] ${r.titolo} — ${r.dettaglio} (spazio: ${r.spazio})`)
      .join('\n');
  }

  if (nome === 'scheda_cliente') {
    const nomeCliente = testo(input.nome);
    const voci = cercaNellIndice(nomeCliente, 12);
    if (voci.length === 0) {
      return `Non trovo nessun cliente che corrisponda a "${nomeCliente}". Controlla il nome, o dimmi tu chi è e lo aggiungo.`;
    }
    return voci
      .map((r) => `[${r.tipo}] ${r.titolo} — ${r.dettaglio}`)
      .join('\n');
  }

  return `Strumento di lettura non riconosciuto: ${nome}`;
}
