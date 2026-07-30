# AIOS Product Bible
## Modulo 1 — Home Dashboard

**Stato:** Bozza per approvazione
**Si basa su:** Modulo 0 — Design System (approvato)
**Prossimo modulo dopo approvazione:** da concordare (Accesso, Navigazione o Chat AI)

---

## Premessa — cosa NON deve essere la Home

Prima di descrivere cosa la Home è, fisso cosa deve evitare di diventare, perché è il rischio più concreto per questo schermo specifico: una Home che prova a mostrare tutto diventa un cruscotto di aereo, non un cervello. Ogni elemento che compare deve superare una domanda sola: *"se questo elemento sparisse oggi, l'utente perderebbe una decisione o solo un dato che avrebbe potuto ignorare?"* Solo la prima categoria resta.

---

## 1. Layout generale

### 1.1 Struttura a tre zone (desktop, >1280px)

```
┌──────────┬──────────────────────────────────────┬─────────────────┐
│          │  TOPBAR: ricerca globale · workspace  │                 │
│ SIDEBAR  │        · notifiche · avatar           │  BUSINESS BRAIN │
│          ├──────────────────────────────────────┤  PANEL          │
│ 64/240px │  AI DAILY BRIEF (collassabile)         │  (colonna       │
│          ├──────────────────────────────────────┤  destra fissa,  │
│ moduli   │  KPI ROW (widget orizzontali)          │  360px)         │
│          ├──────────────────────────────────────┤                 │
│          │  GRIGLIA WIDGET (2 colonne):           │  · stato AI     │
│          │  Timeline · Agenda · Azioni rapide     │  · suggerimenti │
│          │  · Notifiche · widget custom           │  · spiegazioni  │
└──────────┴──────────────────────────────────────┴─────────────────┘
```

**Perché tre colonne e non due:** separare fisicamente "ciò che è successo/da fare" (colonna centrale) da "ciò che l'AI sta pensando" (colonna destra) è la decisione strutturale più importante della Home. Se il pannello AI fosse mescolato tra i widget, l'utente non distinguerebbe più un dato oggettivo da un suggerimento — e la fiducia nell'AI si costruisce proprio sulla chiarezza di questo confine, coerente con il linguaggio visivo AI definito nel Design System (sezione 5.1).

### 1.2 Griglia e dimensioni

- Sidebar: 240px espansa, 64px collassata a sole icone (toggle persistente per utente).
- Colonna centrale: fluida, minimo 560px.
- Business Brain Panel: 360px fisso su desktop grande (>1440px), si comprime a overlay richiamabile tra 1280–1440px.
- Gutter tra colonne: 24px, coerente con la griglia a 4px del Design System.

### 1.3 Comportamento della Topbar

Sempre visibile (sticky), altezza 56px. Contiene, da sinistra a destra: selettore Workspace (azienda attiva, con cambio rapido — collegato al sistema Workspace della Costituzione), barra di ricerca universale centrata (si espande in Command Palette con `Cmd/Ctrl+K`), centro notifiche (icona con badge numerico per impatto alto), avatar utente con menu account.

---

## 2. Dashboard principale — cosa appare aprendo AIOS, e in che ordine

Ordine verticale nella colonna centrale, motivato da priorità decisionale (non cronologica, non alfabetica):

1. **AI Daily Brief** — perché è la sintesi che permette di decidere se serve approfondire oltre.
2. **KPI Row** — la fotografia numerica immediata.
3. **Ciò che richiede una decisione oggi** (approvazioni pendenti, anomalie) — prima della semplice cronaca.
4. **Timeline e attività recenti** — il contesto, per chi vuole capire il "perché" dietro ai numeri.
5. **Agenda della giornata** — cosa succede dopo, in ordine di tempo.

Questo ordine è lo stesso identico per ogni utente alla prima apertura (default di fabbrica); si adatta poi in base a ruolo e comportamento (sezione 5 e Scenari, sezione 13) — ma **il principio di ordinamento per priorità decisionale non cambia mai**, cambia solo cosa risulta prioritario per quel ruolo specifico.

---

## 3. Business Brain Panel

### 3.1 Obiettivo

Rendere visibile un lavoro che altrimenti sarebbe invisibile: l'AI analizza continuamente, ma un utente non deve mai chiedersi "sta facendo qualcosa o è fermo?". Il pannello esiste per rispondere a questa domanda prima ancora che venga posta.

### 3.2 Contenuto e stati

| Stato | Aspetto | Comportamento |
|---|---|---|
| **Al lavoro** | Indicatore pulsante (puntino animato, coerente col Design System 5.1) + testo breve ("Sto analizzando 3 anomalie nei pagamenti...") | Aggiornamento in tempo reale via websocket, non polling |
| **In attesa di una tua decisione** | Card evidenziata con bordo a gradiente, contatore ("2 proposte da approvare") | Click apre il dettaglio della proposta con azioni Approva/Modifica/Rifiuta |
| **Nessuna attività rilevante** | Messaggio neutro, mai un pannello vuoto senza spiegazione ("Tutto sotto controllo. Ultima analisi 4 minuti fa.") | Evita l'ansia di uno stato vuoto ambiguo (vedi 14) |

### 3.3 Ogni voce del pannello espone sempre tre informazioni (obbligatorio, non opzionale)

1. **Perché** viene mostrata (quale evento l'ha generata)
2. **Quali dati** ha usato (link diretto alle fonti — un ordine, un'email, uno storico)
3. **Livello di autonomia** con cui l'AI può agire su quel suggerimento specifico (badge coerente con la matrice della Costituzione: "Richiede la tua approvazione" / "Eseguito automaticamente, puoi annullare entro 10 minuti")

Questo terzo punto è la traduzione visiva diretta del Motore delle Autorizzazioni AI descritto nella Costituzione: l'utente vede sempre, senza doverlo chiedere, quanto controllo ha su ciò che sta guardando.

### 3.4 Interazione con Business Brain e AI Agent

Ogni card del pannello è generata dall'Agent Orchestrator (Costituzione, sez. 2) e recuperata dal Business Brain tramite la Memoria multilivello appropriata al tipo di suggerimento (operativa per un'anomalia di oggi, strategica per un trend di lungo periodo). Click su "quali dati ha usato" naviga direttamente all'entità nel Knowledge Graph.

### 3.5 Responsive

- **Tablet:** il pannello si trasforma in un tab richiamabile ("AI") accanto al contenuto principale, non scompare mai.
- **Mobile:** diventa la prima schermata (vedi scenario "Imprenditore da telefono", sez. 13.6) — su schermi piccoli l'AI Brief sostituisce la dashboard tradizionale come punto di ingresso, perché è la forma più densa di informazione per lo spazio disponibile.

---

## 4. AI Daily Brief

### 4.1 Quando viene generato

Ogni mattina alle 6:00 (ora del fuso dell'azienda), pronto prima che il primo utente effettui il login; ricalcolato su richiesta esplicita ("Aggiorna il briefing") se l'utente lo apre a fine giornata e i dati sono cambiati significativamente.

### 4.2 Struttura del contenuto (ordine fisso)

1. **Una frase di sintesi** (mai più di 20 parole) — lo stato generale in un colpo d'occhio.
2. **Fino a 3 priorità** del giorno, ciascuna con azione diretta collegata.
3. **Un solo approfondimento numerico** (il KPI che è cambiato di più, con motivazione).
4. **Chiusura opzionale**: un'opportunità individuata, se ce n'è una genuina — mai forzata se non c'è nulla di rilevante.

### 4.3 Stile comunicativo

Tono diretto, mai marketing, mai eccessivamente colloquiale. Esempio corretto: *"Il margine medio è sceso del 3% questa settimana, causa aumento costo materia prima Beta. Ti consiglio di rivedere il listino entro venerdì."* Esempio scorretto da evitare sempre: *"Buongiorno! Ecco alcune interessanti novità sulla tua fantastica azienda oggi! 🎉"* — l'entusiasmo posticcio è il modo più rapido per perdere la fiducia di un CFO.

### 4.4 Grafica

Card a tutta larghezza sotto la Topbar, sfondo `bg-surface`, bordo sottile a gradiente AI (Design System 5.1) solo sul lato sinistro (4px), non su tutto il perimetro — per non appesantire un elemento che l'utente legge ogni giorno. Collassabile con un click, stato ricordato per sessione.

### 4.5 Automazioni disponibili

L'utente può richiedere che il Brief venga anche inviato via email o WhatsApp Business alle 6:00, prima ancora di aprire AIOS — configurabile in Settings → Notifiche.

---

## 5. KPI dinamici

### 5.1 Logica di selezione (in ordine di priorità nella scelta automatica)

1. **Ruolo** — un CFO vede cash flow e margini per primi; un responsabile commerciale vede pipeline e preventivi inviati.
2. **Obiettivi impostati** — se l'azienda ha definito un obiettivo di fatturato trimestrale, il KPI relativo resta sempre visibile indipendentemente dal ruolo.
3. **Anomalia recente** — un KPI normalmente secondario "sale" temporaneamente in prima posizione se ha avuto una variazione anomala (es. un calo improvviso delle scorte), con un piccolo indicatore "mostrato per un evento recente".
4. **Storico di attenzione dell'utente** — i KPI che l'utente controlla più spesso manualmente (tramite click o ricerca) guadagnano peso nel tempo.

### 5.2 Contenuto di ogni card KPI

Valore attuale (font mono, Design System 3), variazione percentuale con freccia direzionale colorata semanticamente, un mini-grafico sparkline degli ultimi 30 giorni, e — elemento distintivo di AIOS rispetto a una dashboard tradizionale — **una riga di spiegazione testuale generata dall'AI** sotto il numero ("+12%, trainato principalmente dai clienti del Nord Italia").

### 5.3 Personalizzazione

Ogni card può essere fissata (pin) per restare sempre visibile indipendentemente dalla logica automatica, o nascosta esplicitamente. Ordine di default riordinabile via drag & drop.

---

## 6. Timeline intelligente

### 6.1 Contenuto

Flusso cronologico inverso (più recente in alto) di: email ricevute/inviate, nuovi ordini, documenti generati, azioni AI eseguite, approvazioni concesse/rifiutate, cambi di stato rilevanti (fattura pagata, scorta sotto soglia). Non un log tecnico — un racconto leggibile.

### 6.2 Ogni evento è "spiegabile e navigabile" (requisito esplicito)

Click su un evento apre un pannello laterale con: il dettaglio completo, le entità collegate nel Knowledge Graph (stesso cliente, stesso ordine), e — se l'evento è stato generato o influenzato dall'AI — il collegamento diretto alla motivazione (stesso pattern "perché/quali dati" del Business Brain Panel, sez. 3.3, per coerenza assoluta in tutta la piattaforma).

### 6.3 Filtri e raggruppamento

Filtro rapido per tipo di evento e per modulo di origine; raggruppamento automatico di eventi correlati nello stesso filo (es. "email → preventivo → ordine" per lo stesso cliente appare come un unico blocco espandibile, non tre righe scollegate) — diretta applicazione del principio "Ogni cliente ha una storia" già stabilito nella Costituzione.

### 6.4 Stato vuoto

Per un'azienda appena attivata senza ancora dati: illustrazione minimale + testo "La tua timeline si popolerà automaticamente da qui in avanti" + CTA a connettere la prima casella email, per dare un primo passo concreto invece di uno schermo vuoto senza direzione.

---

## 7. Centro notifiche

### 7.1 Le cinque categorie (obbligatorie, sempre etichettate visivamente)

| Categoria | Colore/trattamento | Esempio |
|---|---|---|
| Informazione | Neutro | "Backup completato" |
| Suggerimento | Bordo AI (gradiente) | "Potresti aumentare lo stock del prodotto Gamma" |
| Anomalia | `warning` | "Il tempo medio di risposta email è raddoppiato" |
| Emergenza | `danger`, sempre in cima indipendentemente da altri criteri | "Pagamento fornitore in scadenza tra 2 ore, saldo insufficiente" |
| Opportunità | `brand-violet` tenue | "Un cliente simile a 3 clienti di alto valore ha appena richiesto un preventivo" |

### 7.2 Algoritmo di ordinamento — impatto sul business, non cronologia

Ordine calcolato da: gravità della categoria (Emergenza sempre prima) → impatto economico stimato quando disponibile (una notifica che riguarda 50.000€ precede una da 500€ a parità di categoria) → recency come criterio finale di spareggio, mai come criterio primario. Questo è esplicitamente diverso da un feed social o da un client email, dove l'ordine cronologico è la norma — in AIOS sarebbe un errore di prodotto.

### 7.3 Interazione

Ogni notifica ha azioni dirette in linea (Approva, Ignora, Rimanda, Apri dettaglio) — mai una notifica che costringe a navigare altrove solo per capire di cosa si tratta.

---

## 8. Azioni rapide

### 8.1 Selezione delle azioni mostrate

Le azioni rapide **non sono una lista fissa configurata a mano**: sono calcolate dalle 5 azioni più frequenti eseguite da quell'utente specifico nelle ultime settimane, con un limite fisso di 2 azioni "suggerite dall'AI" per ruolo (es. per un commerciale: "Crea preventivo" appare sempre tra le prime anche se non fosse tra le più cliccate, perché statisticamente è l'azione che un commerciale userà quel giorno il 90% delle volte).

### 8.2 Aspetto

Riga orizzontale di pulsanti-icona con etichetta, sotto la KPI Row, massimo 6 visibili + "Altro" per il resto. Ogni azione apre direttamente il flusso relativo (es. "Nuovo preventivo" apre il modulo Quotes con il form già pronto), mai una schermata intermedia di conferma inutile per azioni non distruttive.

---

## 9. Agenda intelligente

### 9.1 Contenuto

Vista compatta della giornata (non un calendario mensile completo, quello vive nel modulo Calendar): prossimi 3 impegni, scadenze del giorno, task assegnati con priorità.

### 9.2 Riorganizzazione automatica — con spiegazione obbligatoria

Se l'AI propone di spostare un impegno (es. anticipare una chiamata perché un'altra riunione rischia di sovrapporsi), la proposta appare come card **non eseguita automaticamente di default** (livello di autonomia 2 — preparazione, coerente con la Costituzione) con testo: *"Suggerisco di spostare la chiamata con Rossi Srl alle 15:00: la riunione delle 14:30 rischia di protrarsi in base alla durata media dei tuoi ultimi 5 meeting simili."* Un click conferma, un click rifiuta — mai una riorganizzazione silenziosa del calendario di qualcuno senza il suo consenso esplicito, anche se l'AI fosse "sicura" al 95%.

---

## 10. Widget modulari

### 10.1 Architettura del sistema

Griglia a blocchi (12 colonne, come da Design System 4), ogni widget occupa un numero di colonne/righe predefinito con 2–3 dimensioni consentite per widget (compatto/standard/esteso) — non ridimensionamento libero pixel-per-pixel, che porterebbe a layout disordinati e rotti tra utenti diversi.

### 10.2 Operazioni disponibili

- **Aggiungere**: pannello "Aggiungi widget" con anteprima live prima di confermare.
- **Rimuovere**: singolo click con conferma leggera (toast con "Annulla", non un modale — è un'azione reversibile e frequente, non merita l'attrito di una conferma pesante, coerente col principio del Design System 6.3 sulla proporzionalità delle conferme).
- **Ridimensionare**: tra le dimensioni consentite per quel widget specifico.
- **Spostare**: drag & drop con snap alla griglia, indicatore visivo della posizione di destinazione durante il trascinamento.
- **Salvare**: automatico e continuo (nessun pulsante "Salva layout" — ogni modifica persiste subito, coerente con l'aspettativa di velocità).

### 10.3 Catalogo widget disponibili al lancio

KPI singolo, Timeline, Agenda, Notifiche, Azioni rapide, Grafico personalizzato (Analytics), Elenco clienti a rischio abbandono, Stato magazzino critico, Riepilogo cash flow — estendibile in futuro dal Marketplace (Modulo 12).

---

## 11. Personalizzazione

Salvata per singolo utente (non per azienda): layout dei widget, densità (Design System 4), tema chiaro/scuro (o "Automatico", segue il sistema operativo), scorciatoie da tastiera personalizzabili per le azioni rapide più usate. La personalizzazione **non tocca mai i dati o i permessi** — un utente può riorganizzare la propria vista senza alcun rischio, per costruire nel tempo la fiducia che "sperimentare con la Home" non ha conseguenze negative.

---

## 12. Esperienza AI nella Home — sintesi dei principi già applicati sopra

L'AI nella Home non è un blocco isolato: è distribuita su ogni sezione (Brief, KPI, Timeline, Agenda) ma **sempre con lo stesso linguaggio visivo e lo stesso pattern di spiegabilità** (perché / quali dati / che beneficio). Non è invasiva perché non interrompe mai con un pop-up modale non richiesto: ogni suggerimento vive nel proprio spazio designato, visibile ma non bloccante — l'utente sceglie quando guardarlo, l'AI non sceglie mai per lui quando deve guardarlo.

---

## 13. Scenari di utilizzo

### 13.1 CEO alle 8:00 del mattino

Apre AIOS da desktop in ufficio. La Home mostra prima di tutto l'AI Daily Brief con la sintesi generale dell'azienda (non di un singolo reparto), KPI di alto livello (fatturato, margine, liquidità), e nel Business Brain Panel eventuali decisioni che solo un ruolo executive può approvare (es. uno sconto oltre soglia massima). La Timeline è filtrata di default su eventi "rilevanti a livello aziendale", non ogni singola email.

### 13.2 Responsabile commerciale

KPI Row guidata da pipeline, preventivi inviati, tasso di conversione. Azioni rapide dominate da "Nuovo preventivo" e "Registra chiamata". Il Business Brain Panel privilegia suggerimenti relativi a clienti a rischio abbandono e follow-up in ritardo.

### 13.3 CFO

KPI Row guidata da cash flow, margine, fatture scadute. L'AI Daily Brief per questo ruolo enfatizza sempre l'approfondimento numerico (sez. 4.2, punto 3) su temi finanziari anche se non fossero il cambiamento più grande dell'azienda quel giorno — un CFO deve poter fidarsi che il proprio dominio non venga mai "silenziato" da un evento di un altro reparto.

### 13.4 Responsabile HR

Timeline focalizzata su richieste ferie/permessi in attesa, scadenze formative. Agenda intelligente evidenzia colloqui e scadenze contrattuali. KPI legati a turnover e presenze, non a fatturato.

### 13.5 Magazziniere

Home semplificata: la colonna KPI si riduce a scorte critiche e ordini da preparare, il Business Brain Panel mostra quasi esclusivamente suggerimenti di riordino. Nessun widget finanziario di default — non per limitazione di permesso (quella è gestita separatamente, Costituzione sez. 5), ma per pertinenza: mostrare margini a chi gestisce lo scaffale sarebbe rumore, non informazione.

### 13.6 Imprenditore da telefono

Su mobile, la Home si comprime nell'ordine: AI Daily Brief (a schermo intero, prima cosa vista), poi le 3 priorità del Business Brain Panel, poi Azioni rapide (max 4, le più critiche), infine un link "Vedi la dashboard completa" per chi vuole approfondire. La logica: da telefono, in mezzicorridoio o in auto, l'utente ha 15 secondi, non 15 minuti — la Home mobile deve rispondere subito alla domanda "devo preoccuparmi di qualcosa adesso?".

---

## 14. Stati della schermata (trasversali a tutte le sezioni sopra)

- **Caricamento iniziale:** skeleton screen (sagome animate a bassa opacità) per ogni sezione, mai uno spinner centrale unico che blocca la percezione di velocità — ogni sezione appare pronta appena i suoi dati arrivano, senza attendere le altre.
- **Stato vuoto** (azienda nuova, nessun dato storico): ogni sezione ha un proprio messaggio guida verso la prima azione utile (vedi 6.4 per la Timeline come esempio del pattern).
- **Stato di errore** (un modulo non risponde): la sezione specifica mostra un messaggio contenuto ("Non riusciamo a caricare la Timeline in questo momento — Riprova") senza mai far apparire l'intera Home rotta per il malfunzionamento di una singola parte.

---

## 15. Accessibilità specifica della Home

Ordine di tabulazione: Topbar → AI Daily Brief → KPI → contenuto centrale → Business Brain Panel — un ordine che rispecchia la priorità visiva, non l'ordine del DOM per convenienza implementativa. Ogni KPI ha una descrizione testuale completa per screen reader (non solo il numero: "Fatturato, 284 mila euro, in aumento del 12 percento").

---

## Conclusione del modulo

### Principi progettuali applicati

Priorità decisionale come criterio di ordinamento universale; separazione netta tra dato oggettivo e suggerimento AI; spiegabilità come requisito strutturale, non opzionale; personalizzazione profonda ma senza rischio sui dati.

### Vantaggi di questo approccio

Un utente nuovo e uno che usa AIOS da un anno vedono la stessa logica di fondo, anche se il contenuto è completamente diverso — questo riduce drasticamente la curva di apprendimento tra ruoli diversi nella stessa azienda.

### Criticità da monitorare in fase di sviluppo

- Il calcolo dinamico dei KPI (sez. 5.1) richiede dati di utilizzo storici che non esistono per un cliente nuovo: serve un algoritmo di default sensato per i primi 30 giorni, prima che l'apprendimento sul comportamento dell'utente abbia dati sufficienti.
- Il rischio più grande è la "sovra-notifica": senza disciplina rigorosa nella classificazione (sez. 7.1), il Business Brain Panel rischia di riempirsi di suggerimenti a basso valore, erodendo nel tempo la fiducia che il documento cerca di costruire. Consiglio: definire fin dallo sviluppo una soglia minima di impatto sotto la quale un'osservazione dell'AI resta nei log ma non diventa mai una notifica visibile.

### Suggerimento per lo sviluppo

Costruire prima il sistema di widget modulari (sez. 10) come motore generico, e solo dopo i singoli widget — ogni sezione di questa Home (KPI, Timeline, Agenda...) dovrebbe tecnicamente essere implementata come un widget tra gli altri, anche quelli "core" mostrati di default: questo garantisce che il sistema di personalizzazione non sia un'aggiunta successiva ma la base stessa su cui la Home è costruita.

---

## Prossimo modulo (in attesa di approvazione)

Fammi sapere quale preferisci tra i moduli rimanenti — **Accesso**, **Navigazione** o **Chat AI** — per proseguire nell'ordine che preferisci.
