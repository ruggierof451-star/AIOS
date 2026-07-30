/**
 * DATI SIMULATI dei moduli (vedi MOCKS.md).
 *
 * Un'unica forma dati per tutti gli spazi: il rendering è condiviso
 * (Product Bible: "ogni modulo condivide lo stesso design e la stessa
 * memoria"), i contenuti sono specifici di ciascuno. Quando un modulo
 * avrà API reali, cambia la fonte di questa struttura, non la vista.
 *
 * In ogni `apertura` AIOS parla in prima persona di cosa sta facendo
 * lì dentro: è la regola del brief V3 — mai un elenco freddo di voci.
 */

export type Tono = 'ok' | 'attesa' | 'attenzione' | 'auto' | 'neutro';

export interface RigaSpazio {
  readonly principale: string;
  readonly dettaglio?: string;
  readonly stato?: string;
  readonly tono?: Tono;
  /** Se presente, la riga diventa navigabile (es. una scheda cliente). */
  readonly href?: string;
}

export interface SezioneSpazio {
  readonly titolo: string;
  readonly conta?: string;
  readonly righe: readonly RigaSpazio[];
}

export interface NumeroSpazio {
  readonly etichetta: string;
  readonly valore: string;
  readonly tono?: Tono;
}

export interface DecisioneSpazio {
  readonly parola: string;
  readonly perche: string;
  readonly confidenza?: string;
  readonly bozza?: string;
  readonly bozzaDecisa?: string;
  readonly risposte: readonly string[];
}

export interface DefinizioneSpazio {
  readonly slug: string;
  readonly nome: string;
  readonly apertura: string;
  readonly numeri?: readonly NumeroSpazio[];
  readonly decisioni?: readonly DecisioneSpazio[];
  readonly sezioni: readonly SezioneSpazio[];
}

export const SPAZI: readonly DefinizioneSpazio[] = [
  {
    slug: 'finanza',
    nome: 'Finanza',
    apertura:
      'Ho riconciliato l\u2019estratto conto alle 09:12 e sto seguendo il rimborso Enel. Due cose vorrei approvarle con te prima di muovermi.',
    numeri: [
      { etichetta: 'DA INCASSARE', valore: '\u20AC 48.350', tono: 'attenzione' },
      { etichetta: 'DA PAGARE — 30GG', valore: '\u20AC 21.400' },
      { etichetta: 'CASSA PREVISTA 30GG', valore: '+\u20AC 12.720', tono: 'ok' },
      { etichetta: 'MARGINE MEDIO', valore: '27,4%' },
    ],
    decisioni: [
      {
        parola:
          'Bellini \u00E8 arrivata a 32 giorni sulla fattura n. 214 — \u20AC 6.100. \u00C8 il loro primo ritardo in due anni, quindi ho preparato un promemoria cordiale:',
        perche:
          'Cliente dal 2024, sempre puntuale, ordini in crescita. Un tono duro al primo ritardo rischia pi\u00F9 del credito stesso. Se non rispondono entro 7 giorni, ti proporr\u00F2 io di alzare il tono.',
        confidenza: 'CONFIDENZA 88% — 24 MESI DI STORICO',
        bozza:
          '\u00ABBuongiorno, ci risulta ancora aperta la fattura n. 214. Immaginiamo sia una svista — vi lasciamo i riferimenti per il saldo. Grazie come sempre.\u00BB',
        bozzaDecisa:
          '\u00ABBuongiorno, la fattura n. 214 (\u20AC 6.100) risulta scaduta da oltre 30 giorni. Vi chiediamo di provvedere al saldo entro venerd\u00EC, o di indicarci una data certa.\u00BB',
        risposte: ['Approva e invia', 'Rendilo pi\u00F9 deciso', 'Chiedimi domani'],
      },
      {
        parola:
          'Il F24 di agosto \u00E8 di \u20AC 8.240, scade il 20. Con gli incassi previsti la cassa regge, ma se Nervi slitta oltre il 18 restiamo tirati: vuoi che chieda a Nervi una data certa adesso?',
        perche:
          'Ho confrontato le entrate confermate con le uscite fisse dei prossimi 30 giorni. Nervi \u00E8 l\u2019unica voce che cambia lo scenario da tranquillo a tirato.',
        confidenza: 'CONFIDENZA 91% — SULLE ENTRATE CONFERMATE',
        risposte: ['Chiedi a Nervi', 'Lascio cos\u00EC'],
      },
    ],
    sezioni: [
      {
        titolo: 'DA INCASSARE',
        conta: '3 in ritardo',
        righe: [
          {
            principale: 'Ferramenta Bellini — fattura n. 214',
            dettaglio: '\u20AC 6.100 \u00B7 scaduta da 32 giorni \u00B7 primo ritardo in 2 anni',
            stato: 'SOLLECITO PRONTO',
            tono: 'attenzione',
          },
          {
            principale: 'Cantiere Nervi — fattura n. 218',
            dettaglio: '\u20AC 12.400 \u00B7 saldo lavori \u00B7 ho chiesto conferma della data',
            stato: 'IN ATTESA',
            tono: 'attesa',
          },
          {
            principale: 'Gialli Retail — fattura n. 221',
            dettaglio: '\u20AC 4.850 \u00B7 in scadenza tra 6 giorni',
            stato: 'NEL TERMINE',
          },
          {
            principale: 'Ceramiche Fontana — fattura n. 224',
            dettaglio: '\u20AC 5.200 \u00B7 42 giorni \u00B7 nella loro normalit\u00E0, non la segnalo',
            stato: 'IMPARATO',
            tono: 'auto',
          },
          {
            principale: 'Verdi Logistics — fattura n. 226',
            dettaglio: '\u20AC 19.800 \u00B7 pagamento a 60 giorni concordato',
            stato: 'NEL TERMINE',
          },
        ],
      },
      {
        titolo: 'FATTO IN AUTONOMIA, OGGI',
        righe: [
          {
            principale: 'Riconciliate 14 fatture con l\u2019estratto conto',
            dettaglio: 'Nessuna anomalia oltre al doppio addebito Enel',
            stato: '09:12',
            tono: 'auto',
          },
          {
            principale: 'Registrato l\u2019incasso di Ceramiche Fontana',
            dettaglio: '\u20AC 3.900 \u00B7 fattura n. 209 chiusa',
            stato: '09:41',
            tono: 'auto',
          },
          {
            principale: 'Chiesto il rimborso del doppio addebito Enel',
            dettaglio: '\u20AC 214 \u00B7 in attesa di risposta, ti aggiorno io',
            stato: 'APERTO',
            tono: 'attesa',
          },
        ],
      },
      {
        titolo: 'DA PAGARE',
        righe: [
          { principale: 'F24 di agosto', dettaglio: '\u20AC 8.240 \u00B7 scade il 20', stato: 'FISCALE', tono: 'attenzione' },
          { principale: 'Metalsud — fornitura luglio', dettaglio: '\u20AC 7.310 \u00B7 scade il 28', stato: 'PIANIFICATO' },
          { principale: 'Utenze e canoni', dettaglio: '\u20AC 1.640 \u00B7 addebito automatico', stato: 'AUTOMATICO', tono: 'auto' },
        ],
      },
    ],
  },

  {
    slug: 'clienti',
    nome: 'Clienti',
    apertura:
      'Sto seguendo 3 trattative aperte. Bellini aspetta il tuo sollecito, e su Verdi Logistics ho notato una cosa che vale un tuo minuto.',
    numeri: [
      { etichetta: 'CLIENTI ATTIVI', valore: '87' },
      { etichetta: 'TRATTATIVE APERTE', valore: '3' },
      { etichetta: 'VALORE IN GIOCO', valore: '\u20AC 62.400' },
    ],
    decisioni: [
      {
        parola:
          'Verdi Logistics ha aperto il preventivo quattro volte in due giorni ma non ha risposto. Di solito \u00E8 il segnale che stanno confrontando un\u2019alternativa: vuoi che chiami io l\u2019attenzione con un messaggio breve, o preferisci telefonare tu?',
        perche:
          'Su 14 trattative passate, quando un cliente riapre pi\u00F9 di tre volte senza rispondere, nel 70% dei casi ha chiesto un altro preventivo. Un tuo contatto diretto qui vale pi\u00F9 di una mia email.',
        confidenza: 'CONFIDENZA 74% — CAMPIONE PICCOLO (14 CASI)',
        risposte: ['Scrivi tu', 'Telefono io', 'Aspetta ancora'],
      },
    ],
    sezioni: [
      {
        titolo: 'SCHEDE COMPLETE',
        conta: '4 clienti che conosco a fondo',
        righe: [
          {
            principale: 'Ferramenta Bellini',
            dettaglio: 'Affidabilità alta \u00B7 primo ritardo in 2 anni \u00B7 sollecito pronto',
            stato: 'APRI SCHEDA',
            tono: 'attenzione',
            href: '/clienti/bellini',
          },
          {
            principale: 'Ceramiche Fontana',
            dettaglio: 'Affidabilità alta \u00B7 paga a 40-45 giorni, l\u2019ho imparato',
            stato: 'APRI SCHEDA',
            tono: 'auto',
            href: '/clienti/fontana',
          },
          {
            principale: 'Verdi Logistics',
            dettaglio: 'Rischio alto sulla trattativa da \u20AC 38.500',
            stato: 'APRI SCHEDA',
            tono: 'attenzione',
            href: '/clienti/verdi-logistics',
          },
          {
            principale: 'Cantiere Nervi',
            dettaglio: 'Sopralluogo oggi alle 14:30 \u00B7 dossier già pronto',
            stato: 'APRI SCHEDA',
            tono: 'ok',
            href: '/clienti/nervi',
          },
        ],
      },
      {
        titolo: 'TRATTATIVE APERTE',
        righe: [
          {
            principale: 'Verdi Logistics — impianto capannone 2',
            dettaglio: '\u20AC 38.500 \u00B7 preventivo riaperto 4 volte, nessuna risposta',
            stato: 'DA MUOVERE',
            tono: 'attenzione',
            href: '/clienti/verdi-logistics',
          },
          {
            principale: 'Bianchi & Co — rinnovo contratto annuale',
            dettaglio: '\u20AC 18.000 \u00B7 scade a settembre, ho preparato la proposta',
            stato: 'BOZZA PRONTA',
            tono: 'attesa',
          },
          {
            principale: 'Gialli Retail — manutenzione programmata',
            dettaglio: '\u20AC 5.900 \u00B7 in attesa della loro delibera interna',
            stato: 'IN ATTESA',
            tono: 'attesa',
          },
        ],
      },
      {
        titolo: 'COSA HO IMPARATO SUI TUOI CLIENTI',
        righe: [
          {
            principale: 'Ceramiche Fontana paga tra i 40 e i 45 giorni',
            dettaglio: '11 fatture su 11 \u00B7 ho smesso di segnalarti il ritardo a 30',
            stato: 'CONFIDENZA 94%',
            tono: 'auto',
          },
          {
            principale: 'Bellini ordina sempre a inizio mese',
            dettaglio: 'Preparo la disponibilit\u00E0 degli articoli ricorrenti il 28',
            stato: '9 CONFERME',
            tono: 'auto',
          },
          {
            principale: 'Nervi decide solo dopo un sopralluogo',
            dettaglio: 'Non insisto con i preventivi finch\u00E9 non hai fissato la visita',
            stato: 'REGOLA TUA',
            tono: 'auto',
          },
        ],
      },
      {
        titolo: 'DA RICONTATTARE',
        conta: '14 inattivi da 6 mesi',
        righe: [
          {
            principale: '3 clienti con rischio di abbandono alto',
            dettaglio: 'Ordinavano ogni trimestre, fermi da marzo \u00B7 ho pronta una bozza per ognuno',
            stato: 'PROPOSTA',
            tono: 'attesa',
          },
          {
            principale: '11 clienti fermi ma senza segnali negativi',
            dettaglio: 'Stagionalit\u00E0 normale per il loro settore, non li tratto come persi',
            stato: 'MONITORO',
            tono: 'auto',
          },
        ],
      },
    ],
  },

  {
    slug: 'magazzino',
    nome: 'Magazzino',
    apertura:
      'Ho aggiornato le giacenze in tempo reale: 6 articoli sono sotto la scorta minima e il riordino \u00E8 gi\u00E0 pronto, aspetta solo il tuo ok.',
    numeri: [
      { etichetta: 'ARTICOLI', valore: '1.204' },
      { etichetta: 'SOTTO SCORTA', valore: '6', tono: 'attenzione' },
      { etichetta: 'VALORE GIACENZA', valore: '\u20AC 96.300' },
    ],
    decisioni: [
      {
        parola:
          'Ho preparato il riordino per i 6 articoli sotto scorta: \u20AC 3.180 in tutto. Ho escluso il raccordo da 40 perch\u00E9 ne arrivano 80 pezzi gi\u00E0 gioved\u00EC — riordinarlo ora sarebbe soldi fermi.',
        perche:
          'Ho incrociato le giacenze con gli ordini fornitore gi\u00E0 confermati e con il consumo medio delle ultime 8 settimane, cos\u00EC non riordino ci\u00F2 che sta per arrivare.',
        confidenza: 'CONFIDENZA 93%',
        risposte: ['Approva il riordino', 'Fammi vedere le righe', 'Aspetta gioved\u00EC'],
      },
    ],
    sezioni: [
      {
        titolo: 'SOTTO LA SCORTA MINIMA',
        conta: '6',
        righe: [
          { principale: 'Valvola termostatica 3/4', dettaglio: '4 pezzi \u00B7 minimo 15 \u00B7 consumo 12/settimana', stato: 'CRITICO', tono: 'attenzione' },
          { principale: 'Tubo multistrato 20mm', dettaglio: '30 m \u00B7 minimo 120 m', stato: 'CRITICO', tono: 'attenzione' },
          { principale: 'Collettore 6 vie', dettaglio: '2 pezzi \u00B7 minimo 8', stato: 'DA RIORDINARE' },
          { principale: 'Guarnizioni serie B', dettaglio: '45 pezzi \u00B7 minimo 200', stato: 'DA RIORDINARE' },
          { principale: 'Raccordo 40mm', dettaglio: '6 pezzi \u00B7 80 in arrivo gioved\u00EC \u00B7 escluso dal riordino', stato: 'IN ARRIVO', tono: 'auto' },
        ],
      },
      {
        titolo: 'MOVIMENTI DI OGGI',
        righe: [
          { principale: 'Prenotate 250 unit\u00E0 per l\u2019ordine Nervi', dettaglio: 'Impegnate fino alla consegna di gioved\u00EC', stato: '08:47', tono: 'auto' },
          { principale: 'Carico fornitore Metalsud', dettaglio: '42 articoli \u00B7 listino aggiornato in automatico', stato: '07:55', tono: 'auto' },
          { principale: 'Scarico per cantiere Bianchi', dettaglio: '18 articoli \u00B7 bolla generata', stato: '07:20', tono: 'auto' },
        ],
      },
      {
        titolo: 'LOTTI IN SCADENZA',
        righe: [
          { principale: 'Lotto #4471 — sigillanti', dettaglio: 'Scade tra 12 giorni \u00B7 valore \u20AC 640', stato: 'DA USARE', tono: 'attenzione' },
          { principale: 'Lotto #4489 — schiuma poliuretanica', dettaglio: 'Scade tra 34 giorni', stato: 'MONITORO' },
        ],
      },
    ],
  },

  {
    slug: 'documenti',
    nome: 'Documenti',
    apertura:
      'L\u2019archivio \u00E8 in ordine: ho classificato tutto quello che \u00E8 arrivato ieri. Ci sono 2 contratti in scadenza a settembre — ti avviser\u00F2 io in tempo, non serve che te lo ricordi.',
    numeri: [
      { etichetta: 'DOCUMENTI', valore: '3.847' },
      { etichetta: 'CLASSIFICATI OGGI', valore: '23', tono: 'auto' },
      { etichetta: 'IN SCADENZA — 60GG', valore: '2', tono: 'attenzione' },
    ],
    sezioni: [
      {
        titolo: 'IN SCADENZA',
        righe: [
          {
            principale: 'Contratto di manutenzione — Bianchi & Co',
            dettaglio: 'Scade il 14 settembre \u00B7 rinnovo tacito se non disdetto 30 giorni prima',
            stato: 'TI AVVISO IL 10/08',
            tono: 'attenzione',
          },
          {
            principale: 'Polizza responsabilit\u00E0 civile',
            dettaglio: 'Scade il 30 settembre \u00B7 ho recuperato il premio dell\u2019anno scorso per confronto',
            stato: 'PREPARO IL CONFRONTO',
            tono: 'attesa',
          },
        ],
      },
      {
        titolo: 'ARCHIVIATO IERI',
        conta: '23',
        righe: [
          { principale: '14 fatture fornitore', dettaglio: 'Collegate automaticamente agli ordini corrispondenti', stato: 'AUTONOMO', tono: 'auto' },
          { principale: '6 bolle di consegna', dettaglio: 'Abbinate ai movimenti di magazzino', stato: 'AUTONOMO', tono: 'auto' },
          { principale: '2 documenti girati al commercialista', dettaglio: 'Comunicazione IVA e nota di variazione', stato: 'INVIATO', tono: 'ok' },
          { principale: '1 documento che non ho saputo classificare', dettaglio: 'Allegato senza riferimenti \u00B7 lo lascio a te, non tiro a indovinare', stato: 'DA TE', tono: 'attesa' },
        ],
      },
    ],
  },

  {
    slug: 'calendario',
    nome: 'Calendario',
    apertura:
      'Gioved\u00EC \u00E8 pieno. Ho protetto la mattinata di venerd\u00EC per il preventivo Nervi: senza due ore libere non lo chiudi, e questa settimana era l\u2019unico spazio rimasto.',
    numeri: [
      { etichetta: 'IMPEGNI OGGI', valore: '4' },
      { etichetta: 'ORE PROTETTE', valore: '2 h', tono: 'ok' },
      { etichetta: 'SCADENZE — 14GG', valore: '8', tono: 'attenzione' },
    ],
    sezioni: [
      {
        titolo: 'OGGI',
        righe: [
          { principale: '11:00 — Invio solleciti approvati', dettaglio: 'Lo faccio io, non serve che ci sia tu', stato: 'AUTONOMO', tono: 'auto' },
          { principale: '14:30 — Sopralluogo Cantiere Nervi', dettaglio: 'Ho preparato lo storico ordini e le condizioni concordate', stato: 'PREPARATO', tono: 'ok' },
          { principale: '15:00 — Riepilogo settimanale ai soci', dettaglio: 'Lo preparo io per te e Pier', stato: 'AUTONOMO', tono: 'auto' },
          { principale: '18:30 — Chiusura di giornata', dettaglio: 'Riconciliazione serale e backup', stato: 'AUTONOMO', tono: 'auto' },
        ],
      },
      {
        titolo: 'HO PROTETTO PER TE',
        righe: [
          {
            principale: 'Venerd\u00EC 09:00–11:00 — preventivo Nervi',
            dettaglio: 'Ho spostato una call non urgente a luned\u00EC per liberarla',
            stato: 'PROTETTO',
            tono: 'ok',
          },
        ],
      },
      {
        titolo: 'SCADENZE FISCALI',
        conta: '3',
        righe: [
          { principale: '20 agosto — F24', dettaglio: '\u20AC 8.240 \u00B7 la cassa regge, l\u2019ho verificato', stato: 'VERIFICATO', tono: 'ok' },
          { principale: '31 agosto — comunicazione IVA', dettaglio: 'Documenti gi\u00E0 dal commercialista', stato: 'IN CORSO', tono: 'attesa' },
          { principale: '16 settembre — ritenute', dettaglio: 'Ancora presto, te lo ricordo a settembre', stato: 'MONITORO' },
        ],
      },
    ],
  },

  {
    slug: 'persone',
    nome: 'Persone',
    apertura:
      'Le ferie di agosto sono approvate e non c\u2019\u00E8 nessuna sovrapposizione: nella settimana del 12 restate in tre, sufficiente per i cantieri aperti.',
    numeri: [
      { etichetta: 'PERSONE', valore: '9' },
      { etichetta: 'IN FERIE AD AGOSTO', valore: '6' },
      { etichetta: 'SCADENZE FORMATIVE', valore: '2', tono: 'attenzione' },
    ],
    sezioni: [
      {
        titolo: 'FERIE E PERMESSI',
        righe: [
          { principale: 'Settimana del 12 agosto — 3 persone presenti', dettaglio: 'Copertura verificata sui cantieri aperti', stato: 'OK', tono: 'ok' },
          { principale: 'Settimana del 19 agosto — 2 persone presenti', dettaglio: 'Nessun cantiere programmato, va bene', stato: 'OK', tono: 'ok' },
          { principale: '1 richiesta di permesso in attesa', dettaglio: 'Non ho autorit\u00E0 per approvarla: \u00E8 una decisione tua', stato: 'DA TE', tono: 'attesa' },
        ],
      },
      {
        titolo: 'SCADENZE FORMATIVE',
        conta: '2',
        righe: [
          { principale: 'Corso sicurezza — 2 persone', dettaglio: 'Scade a ottobre \u00B7 ho trovato tre date disponibili a settembre', stato: 'PROPOSTA PRONTA', tono: 'attenzione' },
          { principale: 'Aggiornamento primo soccorso', dettaglio: 'Valido fino a marzo \u00B7 ancora presto', stato: 'MONITORO' },
        ],
      },
    ],
  },

  {
    slug: 'analytics',
    nome: 'Analytics',
    apertura:
      'I numeri sono qui quando li vuoi, senza inseguirti. Ti segnalo solo due cose che ho notato e che non erano evidenti dai totali.',
    numeri: [
      { etichetta: 'FATTURATO — 12 MESI', valore: '\u20AC 284K' },
      { etichetta: 'MARGINE MEDIO', valore: '27,4%' },
      { etichetta: 'ORDINI APERTI', valore: '58' },
      { etichetta: 'TEMPO RESTITUITO — 7GG', valore: '6 h 40 m', tono: 'ok' },
    ],
    sezioni: [
      {
        titolo: 'COSA HO NOTATO',
        righe: [
          {
            principale: 'Il gioved\u00EC vale il 30% degli ordini della settimana',
            dettaglio: 'Da luglio preparo le conferme il mercoled\u00EC sera: tempo medio di risposta sceso da 5 ore a 40 minuti',
            stato: 'CONFIDENZA 89%',
            tono: 'auto',
          },
          {
            principale: 'Il margine sui ricambi urgenti \u00E8 il doppio della media',
            dettaglio: '48% contro 27% \u00B7 sono il 9% del fatturato: vale la pena parlarne',
            stato: 'DA VALUTARE',
            tono: 'attesa',
          },
        ],
      },
      {
        titolo: 'ANDAMENTO',
        righe: [
          { principale: 'Fatturato in crescita del 12% sull\u2019anno scorso', dettaglio: 'Trainato da manutenzioni programmate, non da nuovi clienti', stato: '+12%', tono: 'ok' },
          { principale: 'Tempi di incasso stabili a 38 giorni medi', dettaglio: 'Escluso Fontana, che sta nella sua normalit\u00E0 di 40-45', stato: 'STABILE' },
          { principale: 'Nessun insoluto negli ultimi 18 mesi', dettaglio: 'Il sollecito precoce sta funzionando', stato: 'ZERO', tono: 'ok' },
        ],
      },
    ],
  },
];

export function spazioDaSlug(slug: string): DefinizioneSpazio | undefined {
  return SPAZI.find((s) => s.slug === slug);
}
