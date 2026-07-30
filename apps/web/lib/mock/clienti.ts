/**
 * Schede cliente a 360° — DATI SIMULATI (vedi MOCKS.md).
 *
 * Il criterio di progetto (test del brief V8: "rende AIOS più
 * intelligente o sto solo aggiungendo una schermata?"): una scheda che
 * impila sedici riquadri di dati è solo una schermata. Quindi qui
 * ogni cliente porta:
 *
 *  - un GIUDIZIO di AIOS in prima persona, prima di qualunque numero;
 *  - affidabilità e rischio SEMPRE col ragionamento e la confidenza,
 *    mai un punteggio nudo;
 *  - una timeline dove le azioni di AIOS stanno in mezzo a email,
 *    ordini e telefonate: si vede il collega dentro la storia;
 *  - la memoria specifica del cliente, distinguendo ciò che ha imparato
 *    da ciò che gli è stato detto;
 *  - cosa si aspetta che succeda, con il perché.
 */

import type { DecisioneSpazio, NumeroSpazio } from './spazi';

export type CanaleEvento =
  | 'email'
  | 'ordine'
  | 'fattura'
  | 'telefonata'
  | 'incontro'
  | 'whatsapp'
  | 'aios';

export interface EventoCliente {
  readonly quando: string;
  readonly canale: CanaleEvento;
  readonly cosa: string;
  readonly dettaglio?: string;
}

export interface MemoriaCliente {
  readonly cosa: string;
  readonly origine: string;
}

export interface ValutazioneCliente {
  readonly livello: string;
  readonly perche: string;
  readonly confidenza: string;
}

export interface DefinizioneCliente {
  readonly slug: string;
  readonly nome: string;
  readonly settore: string;
  readonly clienteDal: string;
  /** AIOS parla per primo, e dice cosa pensa. */
  readonly giudizio: string;
  readonly affidabilita: ValutazioneCliente;
  readonly rischio: ValutazioneCliente;
  readonly numeri: readonly NumeroSpazio[];
  readonly attesa?: { readonly cosa: string; readonly perche: string; readonly confidenza: string };
  readonly decisioni?: readonly DecisioneSpazio[];
  readonly memoria: readonly MemoriaCliente[];
  readonly timeline: readonly EventoCliente[];
}

export const ETICHETTE_CANALE: Record<CanaleEvento, string> = {
  email: 'EMAIL',
  ordine: 'ORDINE',
  fattura: 'FATTURA',
  telefonata: 'CHIAMATA',
  incontro: 'INCONTRO',
  whatsapp: 'WHATSAPP',
  aios: 'AIOS',
};

export const CLIENTI: readonly DefinizioneCliente[] = [
  {
    slug: 'bellini',
    nome: 'Ferramenta Bellini',
    settore: 'Rivendita materiale idrotermosanitario',
    clienteDal: 'marzo 2024',
    giudizio:
      'Bellini è solido. Il ritardo di adesso non mi preoccupa e ti dico perché: in due anni non ha mai saltato una scadenza, e gli ordini sono cresciuti del 22% nell\u2019ultimo semestre. Un tono duro qui costerebbe più del credito.',
    affidabilita: {
      livello: 'Alta',
      perche:
        '18 ordini, 17 saldati entro i termini concordati, nessun insoluto. La n. 214 è la prima eccezione. Volume in crescita, non in calo: chi sta per andarsene ordina meno, non di più.',
      confidenza: 'CONFIDENZA 92% — 24 MESI DI STORICO',
    },
    rischio: {
      livello: 'Basso',
      perche:
        'Nessun segnale di difficoltà: nessun ordine annullato, nessuna richiesta di dilazione, pagamenti regolari fino a luglio. Se il sollecito resta senza risposta per 7 giorni cambio valutazione e te lo dico.',
      confidenza: 'CONFIDENZA 88%',
    },
    numeri: [
      { etichetta: 'FATTURATO — 12 MESI', valore: '\u20AC 41.200' },
      { etichetta: 'ORDINI', valore: '18' },
      { etichetta: 'PAGAMENTO MEDIO', valore: '24 giorni' },
      { etichetta: 'APERTO ORA', valore: '\u20AC 6.100', tono: 'attenzione' },
    ],
    attesa: {
      cosa: 'Un ordine ricorrente tra il 1 e il 4 agosto, intorno ai \u20AC 2.800',
      perche:
        'Ha ordinato a inizio mese 11 volte su 12. Ho già verificato la disponibilità degli articoli che prende di solito: ci siamo, tranne le guarnizioni serie B che sono sotto scorta.',
      confidenza: 'CONFIDENZA 85%',
    },
    decisioni: [
      {
        parola:
          'Il sollecito per la n. 214 è pronto con tono cordiale. Vuoi che lo mandi, o preferisci chiamarli tu prima?',
        perche:
          'Per un cliente con questo storico, una telefonata tua vale più di una mia email: sistema il credito e rafforza il rapporto. Ma se preferisci non spenderci tempo, l\u2019email cordiale fa il suo lavoro.',
        confidenza: 'CONFIDENZA 88%',
        bozza:
          '\u00ABBuongiorno, ci risulta ancora aperta la fattura n. 214. Immaginiamo sia una svista — vi lasciamo i riferimenti per il saldo. Grazie come sempre.\u00BB',
        bozzaDecisa:
          '\u00ABBuongiorno, la fattura n. 214 (\u20AC 6.100) risulta scaduta da oltre 30 giorni. Vi chiediamo di provvedere al saldo entro venerdì, o di indicarci una data certa.\u00BB',
        risposte: ['Manda l\u2019email', 'Rendilo più deciso', 'Chiamo io'],
      },
    ],
    memoria: [
      { cosa: 'Ordina sempre a inizio mese', origine: 'IMPARATO \u00B7 9 CONFERME' },
      {
        cosa: 'Al mattino risponde al telefono, alle email no',
        origine: 'IMPARATO \u00B7 6 CONFERME',
      },
      {
        cosa: 'Vuole il DDT sempre allegato alla fattura',
        origine: 'ME L\u2019HAI DETTO TU \u00B7 4 APRILE',
      },
    ],
    timeline: [
      {
        quando: 'oggi 07:15',
        canale: 'aios',
        cosa: 'Ho preparato il sollecito per la n. 214',
        dettaglio: 'Tono cordiale scelto in base allo storico \u00B7 in attesa della tua approvazione',
      },
      {
        quando: '28 luglio',
        canale: 'aios',
        cosa: 'Ho verificato la disponibilità degli articoli che ordina di solito',
        dettaglio: 'In previsione dell\u2019ordine di inizio agosto \u00B7 guarnizioni serie B sotto scorta',
      },
      {
        quando: '18 luglio',
        canale: 'email',
        cosa: 'Hanno chiesto la scheda tecnica dei collettori 6 vie',
        dettaglio: 'Ho risposto con il PDF del fornitore \u00B7 nessun seguito',
      },
      {
        quando: '28 giugno',
        canale: 'fattura',
        cosa: 'Fattura n. 214 emessa — \u20AC 6.100',
        dettaglio: 'Termini 30 giorni \u00B7 scaduta il 28 luglio',
      },
      {
        quando: '26 giugno',
        canale: 'ordine',
        cosa: 'Ordine di 340 articoli',
        dettaglio: 'Il più grande dell\u2019anno \u00B7 consegnato in 3 giorni',
      },
      {
        quando: '12 giugno',
        canale: 'telefonata',
        cosa: 'Hanno chiamato per anticipare la consegna',
        dettaglio: 'Accordato per il 26 \u00B7 nota: preferiscono il telefono la mattina',
      },
      {
        quando: '2 giugno',
        canale: 'fattura',
        cosa: 'Fattura n. 198 saldata — \u20AC 4.350',
        dettaglio: '21 giorni \u00B7 nei termini',
      },
    ],
  },

  {
    slug: 'fontana',
    nome: 'Ceramiche Fontana',
    settore: 'Ceramica e arredo bagno',
    clienteDal: 'settembre 2022',
    giudizio:
      'Fontana paga tardi ma paga sempre. Ho imparato il loro ritmo e ho smesso di segnalartelo come ritardo: era un allarme inutile che ti rubava attenzione. Se un giorno sforano i 50 giorni, quello sì te lo dico.',
    affidabilita: {
      livello: 'Alta',
      perche:
        '11 fatture consecutive saldate tra i 40 e i 45 giorni, nessun insoluto in quattro anni. La lentezza è il loro ciclo amministrativo, non un problema di liquidità: pagano sempre nella stessa finestra, e chi ha difficoltà è irregolare, non regolare.',
      confidenza: 'CONFIDENZA 94% — 11 CONFERME SU 11',
    },
    rischio: {
      livello: 'Basso',
      perche:
        'Nessun segnale di deterioramento. Il rischio reale con Fontana non è il mancato pagamento: è che tu lo tratti come un ritardo e raffreddi un rapporto che funziona.',
      confidenza: 'CONFIDENZA 91%',
    },
    numeri: [
      { etichetta: 'FATTURATO — 12 MESI', valore: '\u20AC 58.700' },
      { etichetta: 'ORDINI', valore: '24' },
      { etichetta: 'PAGAMENTO MEDIO', valore: '42 giorni' },
      { etichetta: 'APERTO ORA', valore: '\u20AC 5.200' },
    ],
    attesa: {
      cosa: 'Il saldo della n. 224 tra il 6 e l\u201911 agosto',
      perche:
        'Emessa il 27 giugno: la loro finestra di 40-45 giorni cade lì. Non serve sollecitare, e infatti non l\u2019ho previsto.',
      confidenza: 'CONFIDENZA 89%',
    },
    memoria: [
      { cosa: 'Paga sempre tra i 40 e i 45 giorni', origine: 'IMPARATO IL 14 LUGLIO \u00B7 11 CONFERME' },
      {
        cosa: 'Vogliono la fattura via PEC, non via email',
        origine: 'ME L\u2019HAI DETTO TU \u00B7 12 GENNAIO',
      },
      { cosa: 'Chiudono le prime due settimane di agosto', origine: 'IMPARATO \u00B7 3 CONFERME' },
    ],
    timeline: [
      {
        quando: 'oggi 09:41',
        canale: 'aios',
        cosa: 'Ho registrato l\u2019incasso della n. 209 — \u20AC 3.900',
        dettaglio: '43 giorni \u00B7 nella loro normalità, riconciliato in autonomia',
      },
      {
        quando: '14 luglio',
        canale: 'aios',
        cosa: 'Ho smesso di segnalarti i loro ritardi a 30 giorni',
        dettaglio: 'Undicesima conferma consecutiva del loro ciclo di 40-45 giorni',
      },
      {
        quando: '27 giugno',
        canale: 'fattura',
        cosa: 'Fattura n. 224 emessa — \u20AC 5.200',
        dettaglio: 'Attesa di saldo tra il 6 e l\u201911 agosto',
      },
      {
        quando: '20 giugno',
        canale: 'ordine',
        cosa: 'Ordine di rivestimenti per il cantiere di Pagani',
        dettaglio: 'Consegnato puntuale \u00B7 nessuna contestazione',
      },
      {
        quando: '9 giugno',
        canale: 'whatsapp',
        cosa: 'Hanno chiesto conferma di una misura',
        dettaglio: 'Risposto in 12 minuti \u00B7 nota: usano WhatsApp per le urgenze',
      },
    ],
  },

  {
    slug: 'verdi-logistics',
    nome: 'Verdi Logistics',
    settore: 'Logistica e trasporti',
    clienteDal: 'novembre 2025',
    giudizio:
      'Qui c\u2019è un rischio concreto, e non è sui pagamenti: è sulla trattativa. Hanno riaperto il preventivo del capannone 2 quattro volte in due giorni senza rispondere. Nella mia esperienza su questo tipo di comportamento, di solito significa che stanno confrontando un\u2019altra offerta.',
    affidabilita: {
      livello: 'Media',
      perche:
        'Solo 3 fatture nello storico, tutte saldate ma con 60 giorni concordati: non ho abbastanza campione per dire di più. Non è un giudizio negativo, è una misura onesta di quanto poco li conosco ancora.',
      confidenza: 'CONFIDENZA 61% — CAMPIONE PICCOLO (3 FATTURE)',
    },
    rischio: {
      livello: 'Alto sulla trattativa aperta',
      perche:
        'Su 14 trattative passate, quando un cliente riapre il preventivo più di tre volte senza rispondere, nel 70% dei casi ha chiesto un\u2019offerta alternativa. Il campione è piccolo e te lo segnalo: 14 casi non fanno una legge, ma fanno un segnale.',
      confidenza: 'CONFIDENZA 74% — CAMPIONE PICCOLO (14 CASI)',
    },
    numeri: [
      { etichetta: 'FATTURATO — 12 MESI', valore: '\u20AC 52.400' },
      { etichetta: 'IN TRATTATIVA', valore: '\u20AC 38.500', tono: 'attenzione' },
      { etichetta: 'PAGAMENTO MEDIO', valore: '58 giorni' },
      { etichetta: 'APERTO ORA', valore: '\u20AC 19.800' },
    ],
    decisioni: [
      {
        parola:
          'Vuoi che scriva io un messaggio breve per riportare il preventivo sul tavolo, o preferisci telefonare tu? Su una cifra del genere e con questo segnale, un tuo contatto diretto pesa di più.',
        perche:
          'Un\u2019email da me rischia di sembrare un sollecito automatico proprio nel momento in cui stanno valutando. Una tua telefonata cambia il tipo di conversazione. Te lo propongo così, ma decidi tu: se non hai tempo, l\u2019email è meglio del silenzio.',
        confidenza: 'CONFIDENZA 74%',
        risposte: ['Scrivi tu', 'Telefono io', 'Aspetta ancora'],
      },
    ],
    memoria: [
      {
        cosa: 'Decidono in due: il titolare e il responsabile operativo',
        origine: 'IMPARATO \u00B7 2 CONFERME',
      },
      { cosa: 'Pagamento a 60 giorni concordato all\u2019apertura', origine: 'DA CONTRATTO' },
    ],
    timeline: [
      {
        quando: 'oggi 06:50',
        canale: 'aios',
        cosa: 'Ho notato la quarta riapertura del preventivo',
        dettaglio: 'Nessuna risposta da 2 giorni \u00B7 ho alzato il rischio sulla trattativa',
      },
      {
        quando: '28 luglio',
        canale: 'email',
        cosa: 'Preventivo capannone 2 inviato — \u20AC 38.500',
        dettaglio: 'Aperto 4 volte, nessuna risposta',
      },
      {
        quando: '22 luglio',
        canale: 'incontro',
        cosa: 'Sopralluogo al capannone 2',
        dettaglio: 'Presenti titolare e responsabile operativo',
      },
      {
        quando: '10 luglio',
        canale: 'fattura',
        cosa: 'Fattura n. 226 emessa — \u20AC 19.800',
        dettaglio: '60 giorni concordati \u00B7 nei termini',
      },
    ],
  },

  {
    slug: 'nervi',
    nome: 'Cantiere Nervi',
    settore: 'Edilizia e costruzioni',
    clienteDal: 'giugno 2023',
    giudizio:
      'Con Nervi ho imparato a non insistere: decidono solo dopo un sopralluogo, e ogni preventivo mandato prima della visita è tempo perso. Oggi alle 14:30 hai il sopralluogo, e ti ho già preparato tutto quello che serve.',
    affidabilita: {
      livello: 'Buona',
      perche:
        '7 fatture saldate, una sola con 15 giorni di ritardo dopo un cambio di amministrativo. Nessun insoluto. Lenti a decidere, puntuali a pagare.',
      confidenza: 'CONFIDENZA 83%',
    },
    rischio: {
      livello: 'Basso, ma il saldo è fermo',
      perche:
        'La n. 218 da \u20AC 12.400 è il saldo lavori: ho chiesto una data certa e sto aspettando la risposta. Con loro l\u2019attesa è normale, ma questa cifra pesa sulla cassa dei prossimi 30 giorni, quindi la tengo d\u2019occhio.',
      confidenza: 'CONFIDENZA 79%',
    },
    numeri: [
      { etichetta: 'FATTURATO — 12 MESI', valore: '\u20AC 78.900' },
      { etichetta: 'ORDINI', valore: '11' },
      { etichetta: 'PAGAMENTO MEDIO', valore: '35 giorni' },
      { etichetta: 'APERTO ORA', valore: '\u20AC 12.400', tono: 'attesa' },
    ],
    attesa: {
      cosa: 'Una decisione sul preventivo entro una settimana dal sopralluogo di oggi',
      perche:
        'È il loro schema su 6 trattative: visita, poi decisione in 5-8 giorni. Per questo ho protetto la tua mattinata di venerdì.',
      confidenza: 'CONFIDENZA 81%',
    },
    memoria: [
      { cosa: 'Decidono solo dopo un sopralluogo', origine: 'IMPARATO \u00B7 6 CONFERME' },
      {
        cosa: 'Hanno cambiato amministrativo a febbraio',
        origine: 'IMPARATO \u00B7 causa dell\u2019unico ritardo',
      },
    ],
    timeline: [
      {
        quando: 'oggi 08:47',
        canale: 'aios',
        cosa: 'Ho spostato la consegna a giovedì come chiedevano',
        dettaglio: 'Corriere confermato \u00B7 250 unità già prenotate in magazzino',
      },
      {
        quando: 'oggi 07:40',
        canale: 'aios',
        cosa: 'Ho preparato il dossier per il sopralluogo di oggi',
        dettaglio: 'Storico ordini, condizioni concordate, saldo aperto',
      },
      {
        quando: '25 luglio',
        canale: 'email',
        cosa: 'Hanno chiesto di spostare la consegna',
        dettaglio: 'Motivo: ritardo di un altro fornitore in cantiere',
      },
      {
        quando: '15 luglio',
        canale: 'fattura',
        cosa: 'Fattura n. 218 emessa — \u20AC 12.400',
        dettaglio: 'Saldo lavori \u00B7 data di pagamento richiesta, in attesa',
      },
    ],
  },
];

export function clienteDaSlug(slug: string): DefinizioneCliente | undefined {
  return CLIENTI.find((c) => c.slug === slug);
}
