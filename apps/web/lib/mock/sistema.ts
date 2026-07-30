/**
 * Integrazioni e Impostazioni — DATI SIMULATI (vedi MOCKS.md).
 *
 * Onestà dichiarata: queste due sezioni sono, oggi, soprattutto la forma
 * definitiva dell'esperienza. Le integrazioni non sono collegate: lo
 * stato di ognuna lo dice apertamente invece di fingere una spunta verde.
 */

export interface Integrazione {
  readonly nome: string;
  readonly categoria: string;
  readonly cosaSbloccherebbe: string;
  readonly stato: 'collegata' | 'pronta' | 'in arrivo';
}

export const INTEGRAZIONI: readonly Integrazione[] = [
  { nome: 'Gmail', categoria: 'Posta', stato: 'pronta', cosaSbloccherebbe: 'Leggere e smistare la posta reale invece dell\u2019esempio.' },
  { nome: 'Outlook', categoria: 'Posta', stato: 'pronta', cosaSbloccherebbe: 'Stessa cosa di Gmail, per chi usa Microsoft 365.' },
  { nome: 'Google Calendar', categoria: 'Agenda', stato: 'pronta', cosaSbloccherebbe: 'Proteggere il tuo tempo davvero, non solo proporlo.' },
  { nome: 'Microsoft 365', categoria: 'Agenda', stato: 'in arrivo', cosaSbloccherebbe: 'Agenda e documenti aziendali.' },
  { nome: 'WhatsApp Business', categoria: 'Messaggi', stato: 'in arrivo', cosaSbloccherebbe: 'I clienti che ti scrivono l\u00EC entrano nella loro scheda.' },
  { nome: 'Telegram', categoria: 'Messaggi', stato: 'in arrivo', cosaSbloccherebbe: 'Ricevere gli avvisi dove li leggi davvero.' },
  { nome: 'Slack', categoria: 'Messaggi', stato: 'in arrivo', cosaSbloccherebbe: 'Portare le decisioni dove lavora la squadra.' },
  { nome: 'Stripe', categoria: 'Pagamenti', stato: 'pronta', cosaSbloccherebbe: 'Vedere gli incassi in tempo reale, non a fine giornata.' },
  { nome: 'Shopify', categoria: 'Vendite', stato: 'in arrivo', cosaSbloccherebbe: 'Ordini online dentro lo stesso magazzino.' },
  { nome: 'WooCommerce', categoria: 'Vendite', stato: 'in arrivo', cosaSbloccherebbe: 'Come Shopify, per chi \u00E8 su WordPress.' },
  { nome: 'TeamSystem', categoria: 'Gestionali', stato: 'pronta', cosaSbloccherebbe: 'Fatture e contabilit\u00E0 senza doppio inserimento.' },
  { nome: 'Zucchetti', categoria: 'Gestionali', stato: 'in arrivo', cosaSbloccherebbe: 'Paghe e presenze collegate a Persone.' },
  { nome: 'SAP', categoria: 'Gestionali', stato: 'in arrivo', cosaSbloccherebbe: 'Per chi arriva da un ERP grande.' },
  { nome: 'HubSpot', categoria: 'CRM', stato: 'in arrivo', cosaSbloccherebbe: 'Storico commerciale dentro le schede cliente.' },
  { nome: 'Salesforce', categoria: 'CRM', stato: 'in arrivo', cosaSbloccherebbe: 'Come HubSpot, per aziende gi\u00E0 strutturate.' },
  { nome: 'Google Drive', categoria: 'Documenti', stato: 'pronta', cosaSbloccherebbe: 'Archiviare e ritrovare i documenti dove gi\u00E0 stanno.' },
  { nome: 'OneDrive', categoria: 'Documenti', stato: 'in arrivo', cosaSbloccherebbe: 'Come Drive, lato Microsoft.' },
  { nome: 'Dropbox', categoria: 'Documenti', stato: 'in arrivo', cosaSbloccherebbe: 'Come Drive, per chi lo usa.' },
  { nome: 'Notion', categoria: 'Documenti', stato: 'in arrivo', cosaSbloccherebbe: 'Procedure interne consultabili da me.' },
];

export interface AreaImpostazioni {
  readonly nome: string;
  readonly descrizione: string;
  readonly stato?: string;
}

export const AREE_IMPOSTAZIONI: readonly AreaImpostazioni[] = [
  { nome: 'Azienda', descrizione: 'Ragione sociale, sede, partita IVA, logo.', stato: 'AIOS SRL' },
  { nome: 'Persone', descrizione: 'Chi lavora con te e cosa può vedere.', stato: '9 persone' },
  { nome: 'AIOS', descrizione: 'Quanto può decidere da solo, il tono, le soglie.', stato: 'Autonomia media' },
  { nome: 'Automazioni', descrizione: 'Cosa gira da solo e cosa aspetta il tuo ok.', stato: '6 attive' },
  { nome: 'Memoria', descrizione: 'Cosa AIOS ha imparato, e cosa puoi fargli dimenticare.', stato: '23 regole' },
  { nome: 'Permessi', descrizione: 'Ruoli e cosa può fare ciascuno.', stato: '3 ruoli' },
  { nome: 'Sicurezza', descrizione: 'Accessi, doppia autenticazione, dispositivi collegati.', stato: 'MFA non attiva' },
  { nome: 'Integrazioni', descrizione: 'I sistemi che AIOS può leggere e usare.', stato: '0 collegate' },
  { nome: 'Spazi di lavoro', descrizione: 'Come è organizzata l\u2019azienda dentro AIOS.', stato: '1 spazio' },
  { nome: 'Aspetto', descrizione: 'Tema, densità delle informazioni, movimento.', stato: 'Scuro' },
  { nome: 'Lingua', descrizione: 'Lingua dell\u2019interfaccia e formato di date e importi.', stato: 'Italiano' },
  { nome: 'API', descrizione: 'Chiavi per collegare AIOS ai tuoi strumenti.', stato: 'Nessuna chiave' },
];
