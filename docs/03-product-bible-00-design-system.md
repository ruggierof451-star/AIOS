# AIOS Product Bible
## Modulo 0 — Design System

**Stato:** Bozza per approvazione — primo dei moduli concordati
**Prossimi moduli, in ordine:** Accesso → Home → Navigazione → Chat AI → CRM → Finance → Inventory → HR → Documents → Calendar → Analytics → Marketplace → Settings

---

## Perché si comincia dal Design System e non da una schermata

Hai elencato "Accesso" come prima sezione e "Design System" in fondo. Prendo la libertà di invertire l'ordine per un motivo preciso: se progettassi prima il Login e poi il CRM, ogni modulo reinventerebbe bottoni, spaziature e colori leggermente diversi — è così che nascono i software che "sembrano cuciti insieme". Un Design System definito prima è quello che garantisce che, arrivati al modulo 12, un pulsante primario sia identico al pulsante primario del modulo 1. Se preferisci che segua l'ordine originale te lo dico che va bene, ma consiglio questa sequenza.

---

## 1. Filosofia grafica

Tre principi non negoziabili, in quest'ordine di priorità quando entrano in conflitto tra loro:

1. **Chiarezza prima di tutto.** Se un'animazione elegante rende un dato meno immediato da leggere, l'animazione perde. AIOS gestisce fatture e margini: l'eleganza non può mai costare un secondo di esitazione a un utente che deve capire se un pagamento è in ritardo.
2. **Un solo modo per fare ogni cosa.** Non due stili di bottone che fanno la stessa azione, non tre pattern diversi per confermare un'eliminazione. La coerenza è la forma più alta di eleganza in un software che si usa otto ore al giorno.
3. **L'interfaccia è la seconda scelta, la lingua naturale è la prima.** Ogni componente grafico esiste per chi preferisce cliccare invece di chiedere ad AIOS — ma deve sempre essere possibile ottenere lo stesso risultato chiedendolo. Questo significa, in pratica: ogni azione disponibile in UI ha un corrispettivo invocabile dalla Chat AI (coerente con la Costituzione, Modulo Business Brain).

**Riferimento e differenziazione.** Notion ci insegna la leggerezza del testo come contenuto primario. Linear ci insegna la velocità percepita e la densità intelligente. Stripe ci insegna la fiducia trasmessa attraverso il rigore tipografico e numerico. Apple ci insegna che ogni animazione deve avere un significato, mai essere decorativa. AIOS prende da ognuno una lezione, non uno stile: l'identità propria di AIOS è **la calma di un sistema che ha già capito il contesto** — l'interfaccia non urla mai per attirare attenzione, la chiede solo quando è davvero il momento (un'anomalia, una decisione da approvare).

---

## 2. Colore

### 2.1 Struttura del sistema colore

AIOS usa **un solo colore di brand a doppia tonalità** (ciano → violetto, coerente con l'identità già stabilita nel sito) riservato esclusivamente a: elementi di intelligenza artificiale, stati attivi/selezionati, e call-to-action primarie. Tutto il resto dell'interfaccia — il 90% di ciò che un utente guarda in una giornata di lavoro — è **neutro**: questa è la decisione più importante dell'intero design system. Un ERP tradizionale colora tutto; AIOS colora solo ciò che conta, così quando qualcosa è colorato l'utente sa che merita attenzione.

### 2.2 Palette — Tema Chiaro (default per l'uso quotidiano in ufficio)

| Token | Valore | Uso |
|---|---|---|
| `bg-canvas` | `#FAFAFB` | Sfondo generale dell'applicazione |
| `bg-surface` | `#FFFFFF` | Card, pannelli, modali |
| `bg-surface-sunken` | `#F2F3F5` | Aree incassate (sidebar, barre laterali) |
| `border-default` | `#E4E6EA` | Bordi standard |
| `border-strong` | `#D1D5DB` | Bordi con maggiore enfasi (focus, hover) |
| `text-primary` | `#14171F` | Testo principale |
| `text-secondary` | `#5B6472` | Testo secondario, etichette |
| `text-tertiary` | `#9AA1AC` | Placeholder, testo disabilitato |
| `brand-cyan` | `#0FB8D4` | Accento AI, stati attivi (versione leggibile su bianco, più scura del ciano usato su sfondo scuro) |
| `brand-violet` | `#7C5CFC` | Accento AI secondario, gradiente con brand-cyan |
| `success` | `#1C9A6C` | Conferme, stati positivi |
| `warning` | `#B7791F` | Attenzione, non bloccante |
| `danger` | `#D8433A` | Errori, azioni distruttive |
| `info` | `#3B7DD8` | Informativo neutro |

### 2.3 Palette — Tema Scuro (per chi lavora la sera, o per preferenza)

| Token | Valore | Uso |
|---|---|---|
| `bg-canvas` | `#0B0E14` | Sfondo generale |
| `bg-surface` | `#12151D` | Card, pannelli |
| `bg-surface-sunken` | `#07090D` | Sidebar |
| `border-default` | `#1F2430` | Bordi standard |
| `border-strong` | `#2C3341` | Bordi con enfasi |
| `text-primary` | `#F1F2F5` | Testo principale |
| `text-secondary` | `#9BA3B0` | Testo secondario |
| `text-tertiary` | `#5C6472` | Placeholder |
| `brand-cyan` | `#42E8F4` | Accento AI (stessa identità del sito) |
| `brand-violet` | `#A78BFA` | Accento AI secondario |
| `success` / `warning` / `danger` / `info` | versioni desaturate del 10% rispetto al tema chiaro | Leggibilità su sfondo scuro senza affaticare |

**Regola di parità semantica:** ogni token ha lo stesso *ruolo* nei due temi — un designer che lavora su una schermata non deve mai chiedersi "questo colore esiste anche nell'altro tema?": esiste sempre, cambia solo il valore. Nessun colore hardcoded fuori dai token, mai.

### 2.4 Il colore come segnale, non come decorazione

Regola operativa per ogni futura schermata: **prima di colorare un elemento, chiediti se stai comunicando uno stato o solo decorando.** Se la risposta è "decorando", il colore corretto è neutro.

---

## 3. Tipografia

| Ruolo | Font | Uso |
|---|---|---|
| Display / titoli | **Space Grotesk** (coerente col sito) | Titoli di pagina, cifre chiave nelle dashboard |
| Corpo testo | **Inter** | Tutto il testo applicativo: label, paragrafi, tabelle |
| Dati tecnici / codice / riferimenti | **IBM Plex Mono** | ID ordine, importi in tabelle finanziarie dove l'allineamento cifra-per-cifra conta, timestamp, snippet di codice in Settings/API |

**Perché un monospace per i dati finanziari:** in una tabella di importi, un font proporzionale fa "danzare" le cifre e rende più lento il confronto visivo tra righe. Stripe lo insegna bene: i numeri finanziari in AIOS (Finance, fatture, dashboard KPI) usano sempre IBM Plex Mono per la cifra stessa, anche se l'etichetta accanto resta in Inter.

### 3.1 Scala tipografica (desktop, base 16px, rapporto 1.25)

| Token | Dimensione | Peso | Uso |
|---|---|---|---|
| `display-lg` | 40px | 600 | Titolo di sezione principale (es. Home) |
| `display-sm` | 28px | 600 | Titolo di pagina modulo (es. "Clienti") |
| `heading` | 20px | 600 | Titolo di card, sezione interna |
| `body-lg` | 16px | 400 | Testo principale, default dei form |
| `body` | 14px | 400 | Densità standard in tabelle e liste |
| `caption` | 12.5px | 500 | Etichette, metadati, timestamp |
| `mono-data` | 14px | 500 | Valori numerici (IBM Plex Mono) |

Su mobile la scala si comprime di un solo gradino (`display-lg`→32px, ecc.), mai di più: un titolo troppo piccolo su mobile è una delle cause più comuni di percezione "low cost" di un software.

---

## 4. Spaziatura e griglia

**Unità base: 4px.** Ogni margine, padding, gap è un multiplo di 4 (4, 8, 12, 16, 24, 32, 48, 64). Nessun valore "a occhio" come 13px o 22px: questa disciplina è ciò che rende un'interfaccia percepita come "curata" anche quando l'utente non saprebbe spiegare perché.

**Densità configurabile:** AIOS offre due densità di visualizzazione per tabelle e liste — **Confortevole** (default, padding riga 12px, per chi guarda pochi dati alla volta) e **Compatta** (padding riga 6px, per power user che gestiscono centinaia di righe, es. magazzino). La densità è una preferenza personale salvata per utente, non per azienda.

**Griglia responsive:** container a 12 colonne su desktop (>1280px), 8 colonne su tablet (768–1279px), colonna singola impilata su mobile (<768px). I breakpoint sono identici a quelli già stabiliti per il sito marketing, per coerenza di codice tra Next.js web e Tauri desktop.

---

## 5. Iconografia

- Stile **line icon**, spessore linea 1.6px, angoli leggermente arrotondati (coerente con le icone già disegnate per il sito).
- Dimensioni standard: 16px (inline con testo), 20px (bottoni, liste), 24px (intestazioni di sezione).
- **Nessuna icona a colori multipli.** Le icone ereditano sempre il colore del testo circostante (`currentColor`), tranne quando rappresentano uno stato semantico (successo/errore), nel qual caso prendono il colore semantico corrispondente.
- Le icone che rappresentano un'azione dell'AI (non un'azione umana diretta) portano un piccolo indicatore visivo coerente — non un'icona diversa per ogni agente, ma un **trattamento visivo unico e riconoscibile** (vedi 5.1) che l'utente impara a riconoscere in tutta la piattaforma.

### 5.1 Il linguaggio visivo dell'AI

Ogni contenuto generato o suggerito dall'AI (non inserito manualmente da un umano) è racchiuso in un contenitore con: bordo sottile a gradiente ciano→violetto (1px), un piccolo indicatore "✦" o puntino pulsante nell'angolo, e un'etichetta testuale minima ("Suggerito da AIOS"). Questo trattamento è **identico** in Chat AI, nelle card di suggerimento in Home, nelle raccomandazioni di Finance, nei preventivi generati automaticamente — ovunque. L'utente, dopo una settimana di utilizzo, riconosce "questo l'ha pensato l'AI" a colpo d'occhio, senza leggere l'etichetta.

---

## 6. Componenti core

### 6.1 Bottoni

| Variante | Uso | Aspetto |
|---|---|---|
| **Primary** | Una sola azione principale per schermata | Sfondo pieno neutro scuro/chiaro (mai il colore brand, riservato all'AI — vedi 2.4), testo a contrasto massimo |
| **AI Action** | Azione proposta dall'AI da confermare | Bordo a gradiente ciano→violetto, sfondo trasparente — visivamente distinto da un bottone primario umano |
| **Secondary** | Azioni alternative | Bordo neutro, sfondo trasparente |
| **Ghost** | Azioni terziarie, dentro tabelle/liste | Nessun bordo, solo testo, sfondo on-hover |
| **Destructive** | Eliminazione, azioni irreversibili | Testo/bordo colore `danger`, richiede sempre conferma (vedi 6.3) |

Stati: default, hover (+4% luminosità), active/pressed (-4%), focus (anello di 2px in `brand-cyan` per accessibilità da tastiera), disabled (opacità 40%, cursore not-allowed). Altezza standard 40px (desktop), 44px minimo (mobile, per target touch adeguato).

### 6.2 Card

Radius 12px, bordo 1px `border-default`, nessuna ombra pesante di default (un'ombra sottile solo su hover per elementi cliccabili, per suggerire interattività senza affaticare la vista con card "sospese" ovunque). Padding interno 20px (desktop) / 16px (mobile).

### 6.3 Modali e conferme

Tre livelli di interruzione, scelti in base alla gravità:

1. **Toast non bloccante** (in basso a destra) — conferme leggere ("Preventivo salvato"), scompare da solo dopo 4 secondi.
2. **Modale centrale** — decisioni che richiedono attenzione ma sono reversibili (modificare un permesso).
3. **Modale con conferma testuale obbligatoria** — solo per azioni distruttive irreversibili e ad alto impatto (eliminare un'azienda, disattivare un utente amministratore): l'utente deve digitare il nome dell'entità per confermare, pattern mutuato direttamente da Stripe/Linear per le azioni a rischio massimo.

### 6.4 Tabelle

Header sticky durante lo scroll verticale, colonne ridimensionabili e riordinabili via drag, ordinamento per click sull'intestazione con indicatore direzionale, selezione multipla con checkbox a sinistra e barra azioni contestuale che appare sopra la tabella quando ≥1 riga è selezionata. Righe con uno stato semantico (es. fattura scaduta) portano un indicatore verticale di 3px sul bordo sinistro della riga nel colore semantico — mai l'intera riga colorata, che affaticherebbe la lettura su tabelle dense.

### 6.5 Grafici

Palette dedicata a 6 colori per serie multiple (derivata dal brand ma desaturata per non competere visivamente con gli accenti AI), sempre accompagnati da valori numerici in etichetta (mai un grafico "muto" che richiede hover per capire il valore), animazione di ingresso una sola volta al caricamento (mai al ogni re-render, per non affaticare con animazioni ripetute durante l'uso normale).

### 6.6 Altri componenti core (specifica sintetica, dettaglio completo nei moduli applicativi)

- **Input/Select:** altezza 40px, label sempre visibile sopra il campo (mai solo placeholder, per accessibilità e chiarezza durante la compilazione).
- **Badge:** per stati (pill arrotondata, colore semantico tenue di sfondo + testo pieno).
- **Tooltip:** ritardo di comparsa 400ms, mai per informazioni essenziali (un'informazione critica non può dipendere da un hover).
- **Toast/notifiche:** vedi 6.3.
- **Tabs:** sottolineatura animata che scorre verso la tab attiva (micro-interazione coerente in tutta la piattaforma).
- **Avatar:** iniziali su sfondo gradiente ciano→violetto quando manca una foto, mai un'icona generica grigia.

---

## 7. Animazione e movimento

**Curva di easing standard:** `cubic-bezier(0.16, 0.84, 0.44, 1)` — la stessa già in uso nel sito, per coerenza totale tra marketing e prodotto. Nessuna animazione lineare, mai: tutto ciò che si muove accelera e rallenta in modo naturale.

**Durate:**
- Micro-interazioni (hover, toggle): 120–180ms
- Transizioni di stato (apertura modale, cambio tab): 200–280ms
- Transizioni di contesto (cambio Workspace, navigazione tra moduli): 300–400ms

**Principio Apple applicato:** ogni animazione deve rispondere a "cosa sta succedendo e da dove viene questo elemento" — un pannello che si apre scorre dal bordo da cui è stato invocato, un elemento che si elimina si rimpicciolisce verso il punto in cui era il cursore, mai un semplice fade generico che non comunica direzione o provenienza.

**Rispetto delle preferenze di sistema:** `prefers-reduced-motion` disattiva ogni animazione non essenziale, mantenendo solo i cambi di stato istantanei — requisito di accessibilità non negoziabile.

---

## 8. Responsive — principi generali (il dettaglio per schermata sarà nei moduli successivi)

- **Desktop (>1280px):** layout a tre colonne dove serve (sidebar + contenuto + pannello contestuale/AI), massima densità informativa.
- **Tablet (768–1279px):** il pannello contestuale/AI diventa un overlay richiamabile, non permanente; sidebar collassabile a icone.
- **Mobile (<768px):** navigazione a singola colonna, sidebar sostituita da tab bar inferiore per le 4–5 destinazioni principali, tutto il resto raggiungibile da un menu "Altro". La Chat AI su mobile diventa il punto di accesso privilegiato per azioni complesse che su desktop richiederebbero più click attraverso menu.

---

## 9. Accessibilità (principi trasversali, dettaglio per componente nei moduli successivi)

- Contrasto minimo AA (4.5:1) su ogni combinazione testo/sfondo in entrambi i temi, verificato per ogni token della palette in fase di implementazione.
- Ogni azione disponibile al mouse è raggiungibile da tastiera, con ordine di tabulazione logico e indicatore di focus sempre visibile (mai `outline: none` senza sostituto).
- Ogni componente interattivo ha un'etichetta accessibile (`aria-label`) anche quando visivamente è solo un'icona.
- Le scorciatoie da tastiera globali (dettagliate modulo per modulo) seguono convenzioni note: `Cmd/Ctrl+K` per la Command Palette, `Cmd/Ctrl+/` per l'aiuto contestuale — mai scorciatoie inventate che confliggono con abitudini consolidate del sistema operativo.

---

## In sintesi — cosa deve ricordare chiunque progetti una nuova schermata da qui in avanti

1. Il colore brand è dell'AI, non della decorazione.
2. Ogni numero finanziario è in monospace.
3. Ogni spaziatura è un multiplo di 4px, senza eccezioni.
4. Ogni contenuto generato dall'AI è visivamente riconoscibile allo stesso modo, ovunque.
5. Un'azione distruttiva ha sempre una conferma proporzionata alla sua gravità, mai automatica.
6. Ogni animazione comunica provenienza e direzione, mai un fade generico.
7. Se una funzione esiste solo come bottone e non è invocabile dalla Chat AI, il modulo non è completo.

---

## Prossimo modulo (in attesa di approvazione)

Con il Design System approvato, il modulo successivo è **Accesso** (Landing Page prodotto, Login, Registrazione, Recupero password, MFA, Invito utenti, Onboarding iniziale) — progettato secondo i principi appena stabiliti.
