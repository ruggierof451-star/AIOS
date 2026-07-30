/**
 * Centro Automazioni — DATI SIMULATI (vedi MOCKS.md).
 *
 * Criterio: un elenco di interruttori on/off è una schermata. Quello che
 * rende utile questa sezione è mostrare, per ogni automazione, **quanto
 * tempo restituisce**, lo storico delle esecuzioni con gli errori veri, e
 * un suggerimento di miglioramento che AIOS propone da sé.
 */

export interface EsecuzioneAutomazione {
  readonly quando: string;
  readonly esito: 'ok' | 'errore' | 'saltata';
  readonly nota: string;
}

export interface Automazione {
  readonly slug: string;
  readonly nome: string;
  readonly cosaFa: string;
  readonly quandoParte: string;
  readonly creataDa: string;
  readonly modo: 'autonoma' | 'approvazione';
  readonly tempoRestituito: string;
  readonly esecuzioni: number;
  readonly errori: number;
  readonly storico: readonly EsecuzioneAutomazione[];
  readonly miglioramento?: string;
}

export const AUTOMAZIONI: readonly Automazione[] = [
  {
    slug: 'riconciliazione',
    nome: 'Riconciliazione bancaria',
    cosaFa: 'Confronto ogni movimento del conto con le fatture aperte e chiudo quelle che corrispondono.',
    quandoParte: 'Ogni mattina alle 09:00',
    creataDa: 'Proposta da me il 3 giugno, approvata da Fabio',
    modo: 'autonoma',
    tempoRestituito: '2 h 10 m a settimana',
    esecuzioni: 58,
    errori: 1,
    storico: [
      { quando: 'oggi 09:12', esito: 'ok', nota: '14 fatture riconciliate, 1 anomalia segnalata' },
      { quando: 'ieri 09:04', esito: 'ok', nota: '9 fatture riconciliate' },
      { quando: '28 lug 09:07', esito: 'errore', nota: 'Banca non raggiungibile per 4 minuti: ho riprovato alle 09:15 ed è andata' },
      { quando: '27 lug 09:02', esito: 'ok', nota: '11 fatture riconciliate' },
    ],
    miglioramento:
      'Se mi dessi accesso anche al secondo conto, coprirei il 100% dei movimenti invece dell\u201984%.',
  },
  {
    slug: 'posta',
    nome: 'Smistamento della posta',
    cosaFa: 'Leggo email e PEC, le classifico, le collego al cliente giusto e giro al commercialista quelle fiscali.',
    quandoParte: 'In continuo, all\u2019arrivo',
    creataDa: 'Proposta da me il 12 maggio, approvata da Fabio',
    modo: 'autonoma',
    tempoRestituito: '3 h 05 m a settimana',
    esecuzioni: 1240,
    errori: 3,
    storico: [
      { quando: 'oggi 07:30', esito: 'ok', nota: '23 email smistate, 2 girate al commercialista' },
      { quando: 'ieri 18:40', esito: 'ok', nota: '11 email smistate' },
      { quando: '26 lug', esito: 'errore', nota: 'Un allegato senza riferimenti: non ho tirato a indovinare, l\u2019ho lasciato a Fabio' },
    ],
  },
  {
    slug: 'listini',
    nome: 'Aggiornamento listini fornitori',
    cosaFa: 'Leggo i cataloghi che arrivano, aggiorno i prezzi di acquisto e ti segnalo solo le variazioni sopra l\u20191%.',
    quandoParte: 'All\u2019arrivo di un catalogo nuovo',
    creataDa: 'Proposta da me il 20 giugno, approvata da Fabio',
    modo: 'autonoma',
    tempoRestituito: '55 m a settimana',
    esecuzioni: 14,
    errori: 0,
    storico: [
      { quando: 'oggi 07:55', esito: 'ok', nota: '42 articoli aggiornati dal catalogo Metalsud' },
      { quando: '22 lug', esito: 'ok', nota: '18 articoli, nessuna variazione rilevante' },
    ],
    miglioramento:
      'Sto leggendo il catalogo Metalsud a mano perch\u00E9 arriva in PDF. Se chiedessi loro il listino in formato dati, il tempo scenderebbe da 40 minuti a pochi secondi.',
  },
  {
    slug: 'riepilogo',
    nome: 'Riepilogo settimanale ai soci',
    cosaFa: 'Preparo e invio a te e Pier il quadro della settimana: incassi, scadenze, cose aperte.',
    quandoParte: 'Ogni venerd\u00EC alle 15:00',
    creataDa: 'Chiesta da Fabio il 14 giugno',
    modo: 'autonoma',
    tempoRestituito: '40 m a settimana',
    esecuzioni: 7,
    errori: 0,
    storico: [
      { quando: '25 lug 15:00', esito: 'ok', nota: 'Inviato a 2 destinatari' },
      { quando: '18 lug 15:00', esito: 'ok', nota: 'Inviato a 2 destinatari' },
    ],
  },
  {
    slug: 'solleciti',
    nome: 'Solleciti di pagamento',
    cosaFa: 'Preparo il sollecito quando una fattura supera la soglia, scegliendo il tono in base allo storico del cliente.',
    quandoParte: 'Al superamento dei 30 giorni',
    creataDa: 'Proposta da me il 2 luglio, approvata da Fabio',
    modo: 'approvazione',
    tempoRestituito: '35 m a settimana',
    esecuzioni: 9,
    errori: 0,
    storico: [
      { quando: 'oggi 07:15', esito: 'ok', nota: 'Sollecito per Bellini preparato, in attesa della tua approvazione' },
      { quando: '11 lug', esito: 'saltata', nota: 'Fontana a 42 giorni: non l\u2019ho preparato, \u00E8 la loro normalit\u00E0' },
    ],
    miglioramento:
      'Su 9 solleciti preparati ne hai approvati 9 senza modifiche. Se vuoi, sotto i \u20AC 2.000 posso mandarli da solo e informarti dopo.',
  },
  {
    slug: 'riordini',
    nome: 'Riordino sotto scorta',
    cosaFa: 'Propongo il riordino degli articoli sotto la scorta minima, escludendo quelli gi\u00E0 in arrivo.',
    quandoParte: 'Al controllo giacenze delle 06:30',
    creataDa: 'Proposta da me il 9 luglio, approvata da Fabio',
    modo: 'approvazione',
    tempoRestituito: '25 m a settimana',
    esecuzioni: 12,
    errori: 0,
    storico: [
      { quando: 'oggi 06:30', esito: 'ok', nota: '5 articoli proposti, raccordo 40mm escluso: ne arrivano 80 gioved\u00EC' },
      { quando: '23 lug', esito: 'ok', nota: '3 articoli proposti e approvati' },
    ],
  },
];

export const TEMPO_TOTALE = '7 h 50 m a settimana';
