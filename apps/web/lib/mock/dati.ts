/**
 * DATI SIMULATI — vedi MOCKS.md alla radice di apps/web.
 * Tutto ciò che il backend non fornisce ancora vive qui, in un posto
 * solo, mai sparso dentro le pagine. Azienda demo: Rossi Impianti S.r.l.
 */

export const azienda = { nome: 'AIOS SRL', iniziali: 'FR', utente: 'Fabio', utenteCompleto: 'Fabio Ruggiero' };

export const numeri = {
  autonomia: '98,4%',
  crediti: '€ 48.350',
  creditiNota: '3 in ritardo',
  tempoRestituito: '6 h 40 m',
  attivitaOggi: 31,
};

export const flussiBrain = [
  { nome: 'EMAIL E PEC', valore: '142 messaggi letti oggi — 2 girati a te' },
  { nome: 'CONTO CORRENTE', valore: 'Sincronizzato alle 09:12 — 1 anomalia trovata, rimborso richiesto' },
  { nome: 'MAGAZZINO', valore: '1.204 articoli — 6 sotto scorta, riordino proposto' },
  { nome: 'SCADENZE', valore: '8 nei prossimi 14 giorni, 3 fiscali' },
];

export const elaborazioni = [
  { testo: 'Sto leggendo il nuovo catalogo Metalsud', stato: 'pag. 41/68' },
  { testo: 'Sto preparando il riepilogo settimanale', stato: 'bozza 2' },
];

export const automazioni = [
  { nome: 'AUTONOME', valore: 'Riconciliazione bancaria · smistamento posta · listini fornitori · riepilogo settimanale' },
  { nome: 'CON APPROVAZIONE', valore: 'Solleciti di pagamento · riordini sotto scorta' },
];

export const spazi = [
  { nome: 'Finanza', daTe: 2, vita: 'Riconciliazione fatta alle 09:12 · rimborso Enel in corso' },
  { nome: 'Clienti', vita: 'Sto seguendo 3 trattative · Bellini in attesa del tuo sollecito' },
  { nome: 'Magazzino', vita: '6 articoli sotto scorta · riordino proposto, aspetta il tuo ok' },
  { nome: 'Documenti', vita: 'Archivio in ordine · 2 contratti in scadenza a settembre, ti avviserò' },
  { nome: 'Calendario', vita: 'Giovedì pieno — ho protetto la mattinata di venerdì per il preventivo Nervi' },
  { nome: 'Persone', vita: 'Ferie di agosto approvate · nessuna sovrapposizione' },
  { nome: 'Analytics', vita: 'I numeri, quando li vuoi — senza che ti inseguano' },
] as const;
