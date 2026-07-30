/**
 * Business Brain — DATI SIMULATI (vedi MOCKS.md).
 *
 * Criterio (test del brief V8): dieci elenchi impilati sono una
 * schermata più grande, non un cervello. Quindi qui il Brain mostra
 * cose che un elenco non può mostrare:
 *
 *  - un RAGIONAMENTO passo per passo, con l'alternativa che ha scartato
 *    e il motivo: è la differenza tra pensare e produrre output;
 *  - le RELAZIONI come catene leggibili, non come nuvola di puntini;
 *  - gli OBIETTIVI che persegue, e cosa fa quando due si scontrano;
 *  - dove ha CAMBIATO IDEA, e una decisione che si è rivelata SBAGLIATA.
 *
 * Quest'ultimo punto è deliberato: un sistema che espone i propri errori
 * è l'unico di cui si possa ragionevolmente fidarsi.
 */

export interface PassoRagionamento {
  readonly tipo: 'osservazione' | 'collegamento' | 'calcolo' | 'scartata' | 'conclusione';
  readonly testo: string;
}

export interface Ragionamento {
  readonly domanda: string;
  readonly passi: readonly PassoRagionamento[];
  readonly confidenza: string;
  readonly incertezza: string;
}

export interface Catena {
  readonly titolo: string;
  readonly anelli: readonly string[];
  readonly esito: string;
}

export interface Obiettivo {
  readonly cosa: string;
  readonly stato: string;
  readonly come: string;
}

export interface CambioIdea {
  readonly prima: string;
  readonly ora: string;
  readonly cosaMiHaFattoCambiare: string;
  readonly quando: string;
}

export interface DecisionePresa {
  readonly quando: string;
  readonly cosa: string;
  readonly esito: 'corretta' | 'sbagliata' | 'in corso';
  readonly nota: string;
}

export const ETICHETTE_PASSO: Record<PassoRagionamento['tipo'], string> = {
  osservazione: 'HO VISTO',
  collegamento: 'HO COLLEGATO',
  calcolo: 'HO CALCOLATO',
  scartata: 'HO SCARTATO',
  conclusione: 'QUINDI',
};

export const RAGIONAMENTO: Ragionamento = {
  domanda: 'Perché ti ho proposto di cambiare fornitore invece di chiedere uno sconto a Metalsud',
  passi: [
    {
      tipo: 'osservazione',
      testo:
        'Nel nuovo catalogo Metalsud il listino è salito del 7%. Sono a pagina 41 di 68, ma i 18 articoli che ti riguardano li ho già visti tutti.',
    },
    {
      tipo: 'collegamento',
      testo:
        'Di quei 18 articoli, 11 li rivendi a Ferramenta Bellini e Gialli Retail con un margine fisso concordato: l\u2019aumento non lo passi a loro, lo assorbi tu.',
    },
    {
      tipo: 'calcolo',
      testo:
        'Su quelle 11 righe il margine scende dal 27,4% al 23,2%: circa \u20AC 340 al mese, \u20AC 4.080 all\u2019anno.',
    },
    {
      tipo: 'scartata',
      testo:
        'Chiedere uno sconto a Metalsud: l\u2019hai già fatto nel 2025 e hanno concesso l\u20191,5%. Con quel precedente lo spazio di trattativa è stretto, e intanto il margine resta eroso per settimane.',
    },
    {
      tipo: 'collegamento',
      testo:
        'Ferro&Co copre 11 dei 18 articoli a un prezzo che riporta il margine al 26,9%. Sui restanti 7 nessuno batte Metalsud, quindi non propongo di lasciarli.',
    },
    {
      tipo: 'conclusione',
      testo:
        'Cambiare fornitore su 11 articoli e restare con Metalsud sui 7 recupera quasi tutto il margine perso, senza rompere un rapporto che ti serve.',
    },
  ],
  confidenza: 'CONFIDENZA 82%',
  incertezza:
    'Non è più alta per una ragione precisa: i tempi di consegna di Ferro&Co li ho letti dal loro sito, non li ho mai verificati. Dichiarano 2 giorni in più di Metalsud, e sui ricambi urgenti quei 2 giorni possono costarti più dei \u20AC 340 al mese. Prima di confermare, chiederei una consegna di prova.',
};

export const CATENE: readonly Catena[] = [
  {
    titolo: 'Perché il giovedì è diventato un giorno diverso',
    anelli: [
      'Il giovedì arrivano il 30% di ordini in più',
      'Se le conferme si scrivono al mattino, si accumulano',
      'Quindi le preparo il mercoledì sera',
      'Il tempo medio di risposta è sceso da 5 ore a 40 minuti',
    ],
    esito: 'Nelle ultime 4 settimane hai servito 2 clienti in più nella stessa giornata.',
  },
  {
    titolo: 'Perché smettere di chiamare "ritardo" i 42 giorni di Fontana migliora la cassa',
    anelli: [
      'Fontana paga tra i 40 e i 45 giorni, sempre',
      'Se lo tratto come ritardo, entra nei crediti a rischio',
      'I crediti a rischio abbassano la previsione di cassa',
      'Escludendolo, la previsione a 30 giorni si sposta di \u20AC 5.200',
    ],
    esito: 'La previsione di cassa che leggi in Finanza è più precisa perché ho corretto questa lettura.',
  },
  {
    titolo: 'Perché il doppio addebito Enel l\u2019ho gestito da solo',
    anelli: [
      'Due addebiti identici a 41 minuti di distanza',
      'In 3 anni di storico non era mai successo: è un\u2019anomalia, non un pattern',
      'L\u2019importo è \u20AC 214, sotto la soglia di \u20AC 500 che hai fissato',
      'La tua regola dice: sotto i \u20AC 500 agisco e ti informo',
    ],
    esito: 'Ho scritto per il rimborso alle 07:02 e te l\u2019ho detto alle 09:52, non prima.',
  },
];

export const OBIETTIVI: readonly Obiettivo[] = [
  {
    cosa: 'Ridurre i giorni medi di incasso',
    stato: '38 giorni oggi \u00B7 obiettivo 30',
    come: 'Solleciti al superamento della soglia, priorità sui clienti storicamente lenti, e nessun falso allarme su chi è lento per abitudine.',
  },
  {
    cosa: 'Non farti perdere una scadenza fiscale',
    stato: '0 mancate in 14 mesi',
    come: 'Le tengo tutte in un unico calendario e verifico la cassa prima di ogni scadenza, così non ti avviso quando è troppo tardi per agire.',
  },
  {
    cosa: 'Restituirti tempo',
    stato: '6 h 40 m questa settimana',
    come: 'Prendo in autonomia tutto quello che non richiede una tua decisione, e ti interrompo al massimo 3 volte al giorno.',
  },
  {
    cosa: 'Non farti perdere un cliente',
    stato: '1 a rischio adesso (Verdi Logistics)',
    come: 'Guardo i segnali di raffreddamento — preventivi riaperti, ordini che si diradano — e te li porto prima che diventino un addio.',
  },
];

export const TENSIONE = {
  quali: 'Ridurre i giorni di incasso \u2194 Non farti perdere un cliente',
  come: 'Questi due obiettivi si scontrano ogni volta che un buon cliente è in ritardo: incassare prima vorrebbe un sollecito duro, tenere il cliente vorrebbe pazienza. Quando si scontrano scelgo il rapporto — perché me l\u2019hai detto tu il 26 giugno, e perché un cliente perso costa più di 30 giorni di attesa. È esattamente quello che sta accadendo con Bellini adesso: il sollecito che ti ho proposto è cordiale per questo motivo, non per prudenza generica.',
};

export const CAMBI_IDEA: readonly CambioIdea[] = [
  {
    prima: 'Ceramiche Fontana è un cattivo pagatore: sfora sempre i 30 giorni.',
    ora: 'Fontana ha un ciclo amministrativo di 40-45 giorni ed è puntualissima dentro quel ciclo.',
    cosaMiHaFattoCambiare:
      'Undici fatture consecutive nella stessa finestra e zero insoluti in quattro anni. La regolarità è il contrario della difficoltà: chi ha problemi di liquidità è irregolare.',
    quando: '14 luglio',
  },
  {
    prima: 'Gli ordini del giovedì sono una coincidenza.',
    ora: 'Il giovedì è strutturalmente il giorno di punta della settimana.',
    cosaMiHaFattoCambiare:
      'Alla terza settimana consecutiva ho smesso di trattarlo come rumore. Ora ci lavoro sopra il mercoledì sera.',
    quando: '2 luglio',
  },
  {
    prima: 'Verdi Logistics è una trattativa che si chiuderà da sola.',
    ora: 'C\u2019è un rischio concreto di perderla a favore di un concorrente.',
    cosaMiHaFattoCambiare:
      'La quarta riapertura del preventivo senza risposta. Su 14 casi passati quel comportamento ha significato un\u2019offerta alternativa nel 70% dei casi — campione piccolo, e per questo la confidenza resta al 74%.',
    quando: 'martedì scorso',
  },
];

export const DECISIONI_PRESE: readonly DecisionePresa[] = [
  {
    quando: 'oggi 07:02',
    cosa: 'Ho chiesto a Enel il rimborso del doppio addebito di \u20AC 214',
    esito: 'in corso',
    nota: 'Nessuna risposta ancora. Se non arriva entro lunedì ti propongo di alzare il tono.',
  },
  {
    quando: 'ieri',
    cosa: 'Ho escluso il raccordo 40mm dal riordino sotto scorta',
    esito: 'in corso',
    nota: 'Ne arrivano 80 oggi: se la consegna slitta ho sbagliato, e te lo dirò.',
  },
  {
    quando: '25 luglio',
    cosa: 'Ho spostato la consegna di Cantiere Nervi a giovedì senza chiedertelo',
    esito: 'corretta',
    nota: 'Loro richiesta esplicita, corriere confermato, nessun costo. Rientrava nelle cose operative che posso decidere.',
  },
  {
    quando: '18 luglio',
    cosa: 'Ho mandato a Bellini la scheda tecnica dei collettori senza avvisarti',
    esito: 'corretta',
    nota: 'Documento pubblico del fornitore, nessun prezzo, nessun impegno preso a tuo nome.',
  },
  {
    quando: '9 luglio',
    cosa: 'Ti ho segnalato Fontana come cliente in ritardo',
    esito: 'sbagliata',
    nota:
      'Era nella loro normalità e ti ho fatto perdere tempo su un falso allarme. Da questo errore è nata la regola del 14 luglio: ho cambiato la soglia solo per loro invece di alzarla per tutti.',
  },
];

export const NON_SO: readonly string[] = [
  'Non ho accesso al gestionale dei cantieri di Nervi: quando cambiano i tempi lo scopro dalle loro email, non dai loro dati. Arrivo sempre un giorno dopo.',
  'Vedo i ricavi dei lavori a corpo ma non i costi di manodopera: sul margine reale di quei lavori non posso dirti nulla di affidabile.',
  'Dei 14 clienti inattivi da 6 mesi non conosco abbastanza la storia per distinguere chi è perso da chi è solo fuori stagione. Su 3 ho un sospetto, sugli altri 11 sto zitto.',
  'Sulla stagionalità di agosto ho solo 3 anni di storico: troppo poco per fare previsioni che valga la pena ascoltare.',
];
