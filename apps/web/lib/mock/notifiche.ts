/**
 * Notifiche — DATI SIMULATI (vedi MOCKS.md).
 *
 * Il criterio di progetto: un elenco di avvisi è solo un'altra
 * schermata. Quello che rende questa parte intelligente è l'inversione:
 * la cosa principale non è ciò che AIOS ti ha detto, è **ciò che ha
 * scelto di non dirti**, con la regola che l'ha silenziato.
 *
 * Tre conseguenze progettuali:
 *  - ogni interruzione porta un "perché adesso", non solo un "cosa";
 *  - AIOS si dà un tetto di interruzioni al giorno e lo dichiara;
 *  - la soglia è correggibile: se ti interrompe per qualcosa che non ti
 *    interessa, glielo dici e diventa una regola tua.
 */

export interface Interruzione {
  readonly id: string;
  readonly cosa: string;
  readonly percheAdesso: string;
  readonly confidenza?: string;
  readonly quando: string;
  readonly href?: string;
}

export interface GruppoSilenziato {
  readonly quante: number;
  readonly cosa: string;
  readonly percheTaciuto: string;
  readonly regola: string;
}

export const INTERRUZIONI: readonly Interruzione[] = [
  {
    id: 'bellini-214',
    cosa: 'Bellini è a 32 giorni sulla fattura n. 214 — \u20AC 6.100',
    percheAdesso:
      'Ha superato la soglia di 30 giorni che hai fissato tu, e serve una tua decisione sul tono: su un cliente con due anni di storico pulito non potevo scegliere da solo.',
    confidenza: 'CONFIDENZA 88%',
    quando: 'oggi 07:15',
    href: '/clienti/bellini',
  },
  {
    id: 'metalsud-listino',
    cosa: 'Metalsud ha alzato il listino del 7% — tocca 18 articoli che rivendi',
    percheAdesso:
      'È una decisione commerciale, non operativa: cambia i tuoi margini e non posso deciderla io. Te l\u2019ho detto stamattina e non ieri sera perché prima volevo finire il confronto con gli altri due fornitori, così arrivi con i conti già fatti.',
    confidenza: 'CONFIDENZA 82% — TEMPI DI CONSEGNA DICHIARATI, NON VERIFICATI',
    quando: 'oggi 08:20',
    href: '/spazi/finanza',
  },
  {
    id: 'verdi-preventivo',
    cosa: 'Verdi Logistics ha riaperto il preventivo 4 volte senza rispondere',
    percheAdesso:
      'Il quarto accesso è il punto in cui, nella tua storia, una trattativa si decide. Questo è un rischio che cresce col tempo: aspettare un altro giorno riduce le tue possibilità, e per questo non l\u2019ho messo in coda.',
    confidenza: 'CONFIDENZA 74% — CAMPIONE PICCOLO (14 CASI)',
    quando: 'oggi 06:50',
    href: '/clienti/verdi-logistics',
  },
];

export const SILENZIATI: readonly GruppoSilenziato[] = [
  {
    quante: 14,
    cosa: 'fatture riconciliate con l\u2019estratto conto',
    percheTaciuto: 'Corrispondevano tutte. Dirtelo una per una sarebbe stato solo rumore.',
    regola: 'AUTOMAZIONE AUTONOMA',
  },
  {
    quante: 12,
    cosa: 'email classificate e archiviate',
    percheTaciuto:
      'Nessuna richiedeva te. Le 2 che riguardavano il commercialista le ho girate a lui e te l\u2019ho segnato nel riepilogo, senza avvisarti sul momento.',
    regola: 'AUTOMAZIONE AUTONOMA',
  },
  {
    quante: 8,
    cosa: 'movimenti bancari',
    percheTaciuto: 'Tutti previsti e nei valori attesi. L\u2019unico fuori posto era il doppio addebito Enel, e quello te l\u2019ho detto.',
    regola: 'AUTOMAZIONE AUTONOMA',
  },
  {
    quante: 5,
    cosa: 'conferme di consegna',
    percheTaciuto: 'Arrivate nei tempi concordati. Ti avviso solo quando slittano.',
    regola: 'AUTOMAZIONE AUTONOMA',
  },
  {
    quante: 4,
    cosa: 'variazioni di listino sotto l\u20191%',
    percheTaciuto:
      'Sotto la soglia che cambia i tuoi prezzi di vendita. Le accumulo e te le riporto nel riepilogo settimanale.',
    regola: 'SOGLIA \u00B7 REGOLA TUA DEL 12 MAGGIO',
  },
  {
    quante: 3,
    cosa: '"ritardi" di Ceramiche Fontana',
    percheTaciuto:
      'Sono nella loro normalità di 40-45 giorni. Segnalarteli sarebbe un falso allarme, e i falsi allarmi ti fanno smettere di guardare le notifiche vere.',
    regola: 'IMPARATO IL 14 LUGLIO \u00B7 11 CONFERME',
  },
  {
    quante: 1,
    cosa: 'accesso da un dispositivo nuovo',
    percheTaciuto: 'Era il tuo telefono, dalla tua rete di sempre. Verificato e archiviato.',
    regola: 'SICUREZZA \u00B7 CONTROLLO SUPERATO',
  },
];

export const TOTALE_SILENZIATE = SILENZIATI.reduce((somma, g) => somma + g.quante, 0);

export const CRITERIO = {
  interrompo: [
    'serve una tua decisione che non posso prendere io',
    'c\u2019è un rischio che cresce col tempo',
    'è un\u2019anomalia che non ho mai visto prima',
  ],
  nonInterrompo: [
    'l\u2019ho già risolto io',
    'rientra in una normalità che ho imparato',
    'è sotto una soglia che hai fissato tu',
  ],
  tetto: {
    quante: 3,
    usate: 3,
    nota:
      'Mi sono dato un tetto di 3 interruzioni al giorno. Oggi le ho usate tutte: se arriva una quarta cosa e non è urgente, aspetta domani. Un collega che ti chiama dieci volte al giorno non è utile, è un problema in più.',
  },
} as const;
