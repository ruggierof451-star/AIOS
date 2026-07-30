# AIOS Product Bible
## Modulo 3 — Navigation System

**Stato:** Bozza per approvazione
**Dipende da:** Design System, Home Dashboard, AI Chat (approvati)
**Prossimo modulo dopo approvazione:** CRM (primo modulo applicativo)

---

## 1. Filosofia della navigazione

### 1.1 Il problema che risolviamo, detto senza giri di parole

In un ERP classico, la navigazione è un indice di un archivio: tante voci di menu quante sono le tabelle del database, organizzate per struttura tecnica del software, non per come pensa chi lo usa. L'utente impara a memoria "dove sta" una funzione, non perché sia lì che la cercherebbe istintivamente, ma perché qualcuno gliel'ha mostrato una volta.

AIOS rovescia il problema: **la navigazione a menu esiste per chi preferisce guardare una struttura, ma non è mai l'unico modo, né il modo più veloce, per arrivare a qualcosa.** Il modo più veloce è sempre chiedere (Chat, Modulo 2) o cercare (Command Palette/Ricerca universale, sezioni 4–5). Il menu è una rete di sicurezza per l'esplorazione, non l'infrastruttura primaria del prodotto.

### 1.2 Perché "meno di tre interazioni" è il vincolo di progetto, non uno slogan

Ogni componente descritto in questo documento è stato verificato contro un solo test: *da un punto qualsiasi della piattaforma, quante azioni servono per arrivare a un'entità specifica (un cliente, un documento, un'impostazione)?* Se la risposta supera tre (es. apri modulo → apri sotto-sezione → scorri una lista → clicca), il componente va ridisegnato prima di procedere. Questo vincolo spiega da solo perché la Ricerca universale e la Command Palette hanno più peso in questo documento della Sidebar stessa.

### 1.3 Cosa deve "sparire" rispetto a un ERP tradizionale

Nessun menu a più di due livelli di profondità nella Sidebar (mai "Modulo → Sottomodulo → Sotto-sottomodulo" — se un modulo ha bisogno di tre livelli per essere navigato, il problema è nell'organizzazione del modulo, non nella Sidebar). Nessuna schermata "indice" fine a se stessa che esiste solo per elencare link ad altre schermate.

---

## 2. Sidebar

### 2.1 Struttura

```
┌──────────────────┐
│ [AI] AIOS  ▾      │  ← Workspace Switcher (vedi 3.1), in cima
├──────────────────┤
│ ○ Home            │
│ ○ Chat AI          │  ← sempre le prime due voci, fisse, mai rimovibili
├──────────────────┤
│ PREFERITI         │  ← sezione personalizzabile, vedi 2.4
│ ★ Rossi Srl        │
│ ★ Report mensile   │
├──────────────────┤
│ MODULI            │
│ ○ CRM              │
│ ○ Finance          │
│ ○ Inventory        │
│ ○ HR               │
│ ○ Documents        │
│ ○ Calendar         │
│ ○ Analytics        │
├──────────────────┤
│ ○ Marketplace      │
│ ○ Settings         │
└──────────────────┘
```

### 2.2 Perché Home e Chat AI sono sempre le prime due voci, non riordinabili

Ogni altro elemento della Sidebar è personalizzabile (sezione 9), ma Home e Chat AI restano fisse in cima per costruzione: sono i due punti di ingresso universali del prodotto (rispettivamente "guarda lo stato" e "chiedi/agisci"), e la costanza della loro posizione è ciò che permette a un utente di orientarsi istantaneamente anche aprendo AIOS su un dispositivo che non usa spesso.

### 2.3 Icone e stato espansa/collassata

Ogni voce ha un'icona a linea (Design System, sezione 5) più un'etichetta testuale in stato espanso (240px); in stato collassato (64px) resta solo l'icona, con tooltip al passaggio del mouse dopo 400ms (Design System, 6.6). Il toggle espansa/collassata è manuale (click su un pulsante dedicato in fondo alla Sidebar) e la scelta è salvata per dispositivo, non per utente globale — un utente può preferire la Sidebar espansa su un monitor grande e collassata su un laptop.

### 2.4 Sezione Preferiti

Elenco libero di **scorciatoie a entità specifiche**, non solo a moduli: un cliente specifico, una vista salvata, una conversazione fissata dalla Chat. Aggiunta tramite un'icona a stella presente in modo coerente su ogni entità in tutta la piattaforma (stesso simbolo, stessa posizione relativa, ovunque — coerente col principio "un solo modo per fare ogni cosa"). Massimo consigliato 8 elementi visibili prima di un "Vedi tutti" — oltre questa soglia la sezione perde la sua funzione di scorciatoia rapida e diventa essa stessa un elenco da scorrere, il problema che vuole risolvere.

### 2.5 Drag & drop e riordino moduli

I moduli sotto "MODULI" sono riordinabili via drag & drop (vedi anche sezione 9). Il riordino è puramente estetico/di comodo — non esiste un ordine "sbagliato" dal punto di vista del sistema, perché ogni modulo resta raggiungibile in egual modo dalla Ricerca universale e dalla Command Palette indipendentemente dalla sua posizione in Sidebar.

### 2.6 Gestione di molti moduli (scalabilità)

Con l'attivazione progressiva di piani superiori (Costituzione/Step1: Starter → Professional → Enterprise) il numero di moduli visibili cresce. Quando i moduli superano una soglia (indicativamente 10), la sezione "MODULI" si divide automaticamente in due sotto-raggruppamenti impliciti — **Usati di frequente** (calcolato, non dichiarato dall'utente) e **Tutti i moduli** (collassato di default, un click per espandere) — mai un secondo livello di menu ad albero, per non violare il principio dei due livelli massimi (1.3).

### 2.7 Plugin del Marketplace nella Sidebar

Un plugin installato (Costituzione, sezione 8) che introduce un nuovo modulo compare nella sezione MODULI **con lo stesso trattamento visivo di un modulo nativo AIOS** — nessuna etichetta "plugin di terze parti" che lo faccia percepire come cittadino di seconda classe, purché abbia superato la certificazione (Costituzione, 8.3). Un badge discreto "Plugin" compare solo dentro Settings → Marketplace, dove l'informazione è pertinente, non in ogni punto dell'interfaccia dove sarebbe rumore.

---

## 3. Topbar

### 3.1 Workspace Switcher

Sempre il primo elemento, angolo superiore sinistro (sopra la Sidebar stessa, per segnalare che è un livello logicamente superiore ai moduli). Click apre un menu a tendina con: elenco delle aziende (tenant) a cui l'utente ha accesso, ciascuna con nome e piccolo logo/iniziali, l'azienda attiva evidenziata. Cambiare workspace (Costituzione, sezione 6.2) aggiorna atomicamente Sidebar, permessi e contesto AI — con un breve indicatore di caricamento se necessario, mai un cambio silenzioso che lasci ambiguità su quale azienda si sta guardando.

### 3.2 Ricerca globale — presenza nella Topbar

Campo di ricerca sempre visibile e cliccabile (mai nascosto dietro un'icona lente da espandere — nel Design System la chiarezza vince sulla economia di spazio) al centro della Topbar, con placeholder che invita esplicitamente ("Cerca o chiedi ad AIOS...") a fondere concettualmente ricerca e comando conversazionale, coerente con la filosofia AI First. Click apre la Command Palette (sezione 4), che include la Ricerca universale (sezione 5) come una delle sue modalità.

### 3.3 Notifiche

Icona campanella, badge solo per Emergenze + Anomalie non lette (Home, sezione 7.3 — stesso identico comportamento, non ridefinito qui). Click apre il pannello Notification Center (sezione 7).

### 3.4 Stato AI

Indicatore compatto (pallino colorato + testo minimo, es. "● Attivo") identico nella forma a quello del Business Brain Panel della Home (sezione 3.3 del Modulo 1) — stessa semantica di colore, stessa terminologia, presente **ovunque nella piattaforma**, non solo in Home: è il modo in cui l'utente sa, in qualunque modulo si trovi, che l'AI sta continuando a lavorare in background.

### 3.5 Profilo utente

Avatar in alto a destra, click apre menu con: Impostazioni account, Preferenze, Tema (chiaro/scuro/automatico), Logout. Nessuna azione operativa (mai un'azione che modifica dati aziendali) vive in questo menu — è riservato a preferenze personali, coerente con Home sezione 11.

### 3.6 Come cambia nei diversi moduli

La Topbar mantiene identica struttura in ogni modulo (Workspace Switcher, Ricerca, Notifiche, Stato AI, Profilo) — **l'unica variazione ammessa** è uno spazio dedicato, tra la Ricerca e le Notifiche, per **azioni contestuali del modulo corrente** (es. in CRM: "Nuovo cliente"; in Finance: "Nuova fattura"). Questa è l'unica eccezione alla regola di uniformità totale, perché un'azione di creazione primaria specifica del modulo ha un valore d'uso troppo alto per essere relegata alla Command Palette.

---

## 4. Command Palette

### 4.1 Perché è il componente singolarmente più importante di questo modulo

La Command Palette è il punto in cui il principio "meno di tre interazioni" diventa letteralmente **una interazione**: apri (scorciatoia globale) → digiti → premi invio. Aperta con `Cmd/Ctrl+K` da qualunque schermata della piattaforma, sempre la stessa scorciatoia, mai rimappabile (le scorciatoie fondamentali restano fisse per garantire che la memoria muscolare funzioni indipendentemente dal contesto — coerente col Design System, sezione 9).

### 4.2 Le cinque modalità in un solo campo

L'utente non sceglie una "modalità" — digita e il sistema classifica automaticamente cosa sta cercando:

| Digitando... | La Palette interpreta come | Risultato mostrato |
|---|---|---|
| Un nome (es. "Rossi") | Ricerca entità | Elenco di clienti/documenti/email pertinenti (sezione 5) |
| Un verbo/comando (es. "crea preventivo") | Comando diretto | Azione eseguibile, apre il flusso di creazione o lo delega alla Chat |
| Un nome di modulo (es. "Finance") | Navigazione | Apre direttamente il modulo |
| "?" o una domanda naturale | Interrogazione AI | Passa alla Chat AI mantenendo il testo digitato come primo messaggio |
| "@" seguito da un nome | Cambio Workspace | Elenco aziende accessibili (stessa funzione del Workspace Switcher, sezione 3.1, accessibile anche da qui per velocità) |

### 4.3 Perché unificare invece di avere comandi separati

Costringere l'utente a sapere in anticipo "sto cercando o sto comandando?" è esattamente il tipo di attrito cognitivo che il principio Zero Cognitive Load vieta. La classificazione è responsabilità del sistema, non un carico mentale da delegare all'utente.

### 4.4 Risultati e navigazione da tastiera

Elenco risultati raggruppato per tipo (Azioni in cima, poi Entità, poi Moduli), navigabile con frecce, esecuzione con invio, chiusura con `Esc`. Ogni risultato mostra una piccola etichetta di categoria a destra (non solo un'icona) per chiarezza immediata.

### 4.5 Cronologia e apprendimento

I comandi/ricerche più recenti e più frequenti dell'utente appaiono come suggerimenti quando la Palette si apre vuota (prima di digitare) — stesso principio di personalizzazione per pattern osservati già visto nei KPI dinamici della Home (Modulo 1, sezione 5.2), applicato qui alla navigazione.

---

## 5. Ricerca Universale

### 5.1 Cosa cerca, in un solo motore

Clienti, aziende, documenti, email, fatture, ordini, task, conversazioni Chat, workflow/automazioni, utenti, voci di impostazioni, plugin installati — **tutto attraverso la stessa interrogazione**, mai motori di ricerca separati per modulo che l'utente deve sapere di dover consultare uno alla volta.

### 5.2 Come funziona tecnicamente (in termini di esperienza, non implementazione)

Combina due strategie in parallelo: corrispondenza esatta/parziale sui campi strutturati (nome cliente, numero fattura) e **ricerca semantica** sulla memoria vettoriale del Business Brain (Costituzione, sezione 1.1) per query concettuali ("il documento dove parlavamo dello sconto di marzo" trova il documento giusto anche senza corrispondenza testuale letterale).

### 5.3 Ranking dei risultati

Ordine per rilevanza combinata: corrispondenza testuale, recency (un'interazione di ieri pesa più di una di un anno fa a parità di corrispondenza), e frequenza di accesso personale dell'utente a quell'entità. Mai un ordine puramente alfabetico o cronologico grezzo.

### 5.4 Filtri

Chip di categoria sopra i risultati (Tutti, Clienti, Documenti, Email, Task...) — stesso pattern di interazione dei filtri della Timeline in Home (Modulo 1, sezione 6.3), per coerenza di componente riutilizzato.

### 5.5 Nessun risultato

Mai una schermata vuota con solo "Nessun risultato trovato": propone sempre un'alternativa attiva — "Vuoi che lo chieda ad AIOS?" con passaggio diretto alla Chat con la query già inserita, trasformando un vicolo cieco in un secondo tentativo utile.

### 5.6 Permessi e visibilità

I risultati rispettano sempre il RBAC dell'utente (Step 1, sezione 12) — un magazziniere che cerca "margine" non vede risultati finanziari a cui non ha accesso, e il sistema non rivela nemmeno l'esistenza di un risultato bloccato (mai un risultato mostrato-ma-illeggibile: se non è accessibile, semplicemente non appare).

---

## 6. Breadcrumb e Contesto

### 6.1 Cosa mostra sempre, in ogni schermata

Riga sottile sotto la Topbar (solo dentro i moduli applicativi, non in Home/Chat dove non serve): `Modulo → Sottosezione → Entità corrente` (es. "CRM → Clienti → Rossi Srl"), ogni segmento cliccabile per risalire. Mai più di tre segmenti (coerente col vincolo dei due livelli massimi, 1.3 — il terzo segmento è sempre l'entità specifica, non un ulteriore livello di menu).

### 6.2 Indicazione del Workspace attivo

Il nome dell'azienda attiva non è ripetuto nel breadcrumb (sarebbe ridondante col Workspace Switcher sempre visibile in Topbar, sezione 3.1) — un solo posto per questa informazione, coerente col principio di non duplicare mai lo stesso dato in due punti dell'interfaccia (già visto nel Modulo Chat, sezione 4.1).

### 6.3 Quali moduli sono coinvolti in un'azione cross-modulo

Quando l'utente sta operando su un'entità che coinvolge più moduli (es. un ordine che tocca CRM, Inventory e Finance), piccole icone discrete accanto al breadcrumb indicano i moduli collegati, ciascuna cliccabile per saltare direttamente alla vista pertinente di quell'entità in quel modulo — mai obbligare l'utente a "uscire e rientrare" da un modulo all'altro passando dalla Sidebar.

---

## 7. Notifiche — Notification Center

### 7.1 Relazione con la Home

Il Notification Center della Topbar (accessibile da ogni schermata) e le notifiche mostrate in Home (Modulo 1, sezione 7) sono **la stessa lista, due punti di accesso**: non esistono due sistemi di notifica paralleli. La Home ne mostra un'anteprima privilegiata per le più urgenti; il Notification Center in Topbar è l'accesso completo, sempre disponibile indipendentemente dal modulo in cui ci si trova.

### 7.2 Raggruppamento

Per entità quando pertinente (3 notifiche sullo stesso cliente si raggruppano in una voce espandibile, non tre righe separate che affollano il pannello) e per categoria (Emergenza/Anomalia/Opportunità/Suggerimento/Informazione, identiche a Home 7.1).

### 7.3 Notifiche collaborative (nuovo rispetto a Home, specifico di questo modulo)

Quando un'azione riguarda un lavoro condiviso tra utenti (es. un collega ha modificato un preventivo che stai seguendo anche tu), la notifica porta un piccolo avatar del collega invece della sola icona di categoria — distinzione visiva immediata tra "l'AI ti segnala qualcosa" e "una persona ha fatto qualcosa", che sono psicologicamente eventi diversi anche quando l'urgenza è simile.

### 7.4 Prevenzione del sovraccarico

Stesso principio della Home (Modulo 1, sezione 14, criticità): soglia minima di impatto sotto la quale un evento resta nel log ma non genera una notifica visibile. In aggiunta qui: un **digest giornaliero opzionale** (attivabile in Settings) che raggruppa le notifiche di categoria Informazione/Suggerimento in un unico riepilogo a fine giornata invece di interruzioni sparse durante il lavoro — rispetta il tempo dell'utente senza eliminare l'informazione.

---

## 8. Navigazione Mobile

### 8.1 Perché non è "la stessa cosa ridotta"

Il contesto d'uso mobile è strutturalmente diverso: sessioni brevi, spesso con una mano sola, spesso in movimento. La navigazione mobile è quindi **riprogettata per compiti brevi e frequenti**, non per esplorazione approfondita (quella resta compito del desktop).

### 8.2 Bottom Navigation

4-5 destinazioni fisse raggiungibili col pollice: **Home, Chat AI** (le stesse due voci fisse della Sidebar desktop, coerenza di principio anche se la forma cambia), **Ricerca** (apre direttamente la Ricerca universale a schermo intero, non la Command Palette testuale che presuppone tastiera fisica), **Notifiche**, **Altro** (accesso a tutti i moduli non presenti in bottom bar, in una vista a griglia semplice, non un menu ad albero).

### 8.3 Gesture

Swipe orizzontale tra Home e Chat AI (le due destinazioni più usate, per un cambio ancora più veloce del tocco su tab); swipe down per chiudere un pannello contestuale/modale; pull-to-refresh su liste e dashboard per un aggiornamento manuale immediato quando l'utente non vuole aspettare il ciclo automatico.

### 8.4 Accesso rapido alla Chat AI

Oltre alla tab dedicata, un pulsante flottante persistente (piccolo, angolo inferiore destro, mai invasivo) è raggiungibile da qualunque schermata mobile per aprire la Chat con un tocco, anche da dentro un modulo applicativo — coerente con l'idea che su mobile la Chat è spesso la via più rapida anche quando si sta già guardando un modulo specifico.

### 8.5 Utilizzo con una mano

Ogni azione primaria (invio messaggio Chat, conferma di un Tool, approvazione di un suggerimento) è raggiungibile nella metà inferiore dello schermo — principio di design mobile ormai consolidato (zona pollice), applicato con disciplina in ogni schermata, non solo nelle principali.

---

## 9. Personalizzazione

| Elemento | Personalizzabile | Fisso per garantire coerenza |
|---|---|---|
| Ordine moduli in Sidebar | Sì (drag & drop) | Home e Chat AI restano sempre in cima |
| Preferiti | Sì (aggiunta/rimozione libera) | — |
| Stato Sidebar espansa/collassata | Sì, per dispositivo | — |
| Scorciatoie da tastiera per Azioni rapide | Sì (riassegnabili) | Le scorciatoie globali strutturali (`Cmd/Ctrl+K`, ecc.) non sono rimappabili |
| Quick Actions in Topbar | Sì (quali mostrare tra quelle disponibili per il modulo) | La presenza di *uno* slot di azione contestuale resta fissa (sezione 3.6) |
| Filtri di default nella Ricerca | Sì (categoria preferita ricordata) | Il motore di ranking (5.3) non è configurabile dall'utente finale |

**Principio guida della tabella:** tutto ciò che è ordine/comodo personale è personalizzabile; tutto ciò che è struttura di orientamento condiviso (dove si trovano le cose in modo prevedibile) resta fisso — coerente con l'intera Product Bible.

---

## 10. Scorciatoie da tastiera

### 10.1 Globali (identiche in ogni modulo, mai rimappabili)

| Scorciatoia | Azione |
|---|---|
| `Cmd/Ctrl + K` | Apri Command Palette |
| `Cmd/Ctrl + J` | Apri/chiudi Chat AI |
| `Cmd/Ctrl + Shift + N` | Nuova conversazione Chat |
| `Cmd/Ctrl + /` | Aiuto contestuale della schermata corrente |
| `Cmd/Ctrl + B` | Espandi/collassa Sidebar |
| `Esc` | Chiudi pannello/modale attivo, sempre, ovunque |

### 10.2 Contestuali (variano per modulo, elencate nel modulo pertinente quando lo progetteremo)

Esempio di principio, non esaustivo qui: `N` per "nuovo record" quando si è dentro una lista (CRM, Finance...), coerente col pattern "una sola lettera per l'azione primaria del contesto" usato da Linear — ma **sempre disattivate quando il focus è su un campo di testo**, per non interferire con la digitazione normale (errore comune da evitare esplicitamente).

### 10.3 Motivazione di ogni scelta

Le scorciatoie globali ricalcano convenzioni già diffuse (Cmd+K è ormai uno standard de facto in Linear, Notion, Raycast) — non inventiamo nuove convenzioni dove ne esistono di consolidate, coerente col principio "non usare template" applicato al design visivo ma **non** alle convenzioni di interazione consolidate, che vanno rispettate proprio per abbassare la curva di apprendimento.

---

## 11. Stati ed errori

| Situazione | Comportamento della navigazione |
|---|---|
| Modulo disattivato (non incluso nel piano) | Compare comunque in Sidebar, in stato disabilitato visivo (opacità ridotta, Design System 6.1), click apre una schermata informativa breve con upgrade proposto — mai nascosto del tutto, per non far percepire il prodotto come "meno ricco" di quanto sia realmente |
| Utente senza permessi | Il modulo/voce semplicemente non compare (coerente con 5.6) — a differenza del caso precedente, qui non c'è valore nel "mostrare cosa non si può vedere" |
| Plugin non disponibile (es. manutenzione del fornitore terzo) | Icona con badge di stato "Temporaneamente non disponibile", mai rimosso silenziosamente dalla Sidebar (l'utente non deve chiedersi se l'ha disinstallato per errore) |
| Ricerca senza risultati | Vedi 5.5 |
| Sistema offline (perdita di connessione) | Banner discreto e persistente in Topbar ("Connessione assente — le modifiche verranno sincronizzate al ripristino"), navigazione tra schermate già caricate resta possibile in sola lettura quando la cache locale lo consente (rilevante soprattutto per l'app Desktop) |
| Integrazione esterna fallita | Non blocca la navigazione generale — l'errore resta confinato al modulo/widget specifico coinvolto, mai un errore che impedisce di usare il resto della piattaforma |

---

## 12. Scenari reali

### CEO
Apre l'app → è già in Home (destinazione di apertura di default per questo ruolo). Per rivedere un cliente specifico: `Cmd+K` → digita il nome → invio. Due interazioni, non tre.

### Commerciale
Passa la maggior parte della giornata tra CRM e Chat. Usa lo swipe mobile (8.3) o il click diretto in Sidebar su desktop. I suoi Preferiti in Sidebar sono quasi tutti clienti specifici, non moduli.

### CFO
Apre l'app e naviga direttamente su Finance (modulo di apertura personalizzato per ruolo, coerente con la logica di default della Home). Usa spesso i filtri della Ricerca universale ristretti a "Fatture" e "Documenti".

### HR
Naviga poco tra moduli diversi — la maggior parte delle sue attività resta dentro HR. Le sue scorciatoie personalizzate (9) sono orientate a "Approva ferie" come Quick Action fissa in Topbar.

### Magazziniere
Uso quasi esclusivamente mobile, spesso vocale tramite Chat. La Bottom Navigation gli basta quasi sempre — raramente usa la Command Palette testuale, che presuppone un contesto da scrivania.

### Imprenditore da smartphone
Swipe continuo tra Home e Chat AI, uso marginale della tab "Altro". Il pulsante flottante Chat (8.4) è probabilmente il suo punto di accesso più usato in assoluto in tutta la piattaforma.

---

## 13. Evoluzione futura

L'architettura di questo Navigation System è già pensata per reggere una crescita di un ordine di grandezza senza ridisegni strutturali:

- **Decine di nuovi moduli:** gestiti dal raggruppamento automatico "Usati di frequente / Tutti i moduli" (2.6), non da nuovi livelli di menu.
- **Centinaia di plugin:** la Ricerca universale e la Command Palette restano il punto di accesso principale anche per funzionalità di terze parti (5.1, 4.2) — non serve una Sidebar che cresca all'infinito, serve un motore di ricerca/comando che scali bene, ed è quello il vero investimento architetturale di questo modulo.
- **Nuovi AI Agent:** non generano nuove voci di navigazione — restano invisibili di default (Modulo Chat, sezione 6.2), coerentemente, anche qui.
- **Funzionalità non ancora esistenti:** il vincolo "meno di tre interazioni" resta il test di accettazione per qualunque futura aggiunta, indipendentemente da cosa sarà.

---

## 14. Conclusione

### Principi fondamentali stabiliti in questo modulo
1. Il menu è una rete di sicurezza per l'esplorazione, non l'infrastruttura primaria di accesso.
2. Mai più di due livelli di profondità nella Sidebar, mai più di tre interazioni per raggiungere un'entità.
3. Ricerca e comando sono un'unica esperienza (Command Palette), non due strumenti separati che l'utente deve scegliere in anticipo.
4. Notifiche in Home e in Topbar sono la stessa lista, non due sistemi paralleli.
5. La navigazione mobile è riprogettata per il contesto d'uso, non una riduzione di quella desktop.

### Decisioni architetturali prese
- Home e Chat AI fisse in cima alla Sidebar e alla Bottom Navigation, mai riordinabili.
- Un solo motore di ricerca (Ricerca universale) alimenta sia la barra in Topbar sia la Command Palette sia la ricerca mobile a schermo intero.
- Le scorciatoie globali strutturali non sono mai rimappabili dall'utente.

### Decisioni rimandate
- Il dettaglio delle scorciatoie contestuali per ogni singolo modulo (da definire modulo per modulo, come già indicato in 10.2).
- L'eventuale navigazione vocale continua ("apri il modulo Finance" a voce) — dipende dal modulo Voice AI non ancora progettato, ma l'architettura a comando classificato della Command Palette (4.2) è già compatibile.

### Dipendenze con Home, Chat AI e moduli futuri
- **Home:** condivide identico Notification Center (sezione 7.1) e identico indicatore di Stato AI (3.4).
- **Chat AI:** la Command Palette passa il testo digitato come primo messaggio quando classificato come domanda (4.2) — stesso componente di input concettualmente.
- **Ogni modulo futuro:** deve rispettare il contratto della Topbar (un solo slot di azione contestuale, sezione 3.6) e apparire in Sidebar seguendo le regole di raggruppamento automatico (2.6), senza eccezioni negoziate caso per caso.

### Impatto sul database
Servirà uno schema per: preferenze di navigazione per utente/dispositivo (ordine moduli, stato Sidebar, filtri di ricerca preferiti), elenco Preferiti per utente, log di frequenza di accesso alle entità (per il ranking di 5.3 e il raggruppamento di 2.6).

### Impatto sulle API
La Ricerca universale richiede un endpoint di ricerca aggregata cross-modulo (non una ricerca per singolo modulo lato client) — un'unica chiamata che interroga in parallelo le fonti pertinenti e restituisce risultati già ordinati per rilevanza, coerente con l'architettura event-driven dello Step 1.

### Impatto sul Business Brain
Nessuna nuova struttura dati richiesta rispetto alla Costituzione — la Ricerca universale è un consumatore della memoria semantica e del Knowledge Graph già esistenti, non un sistema di indicizzazione parallelo.

### Impatto su frontend web, desktop e mobile
Sidebar, Topbar e Command Palette sono componenti condivisi al 100% tra web e desktop (stessa codebase Tauri, Step 1). Su mobile, Bottom Navigation e pulsante flottante Chat sono componenti nativi separati con logica propria, da pianificare come sviluppo dedicato e non come adattamento CSS dei componenti desktop.

---

## Prossimo modulo (in attesa di approvazione)

Con la Navigazione approvata, procediamo con il primo modulo applicativo vero e proprio: **CRM** (Clienti, Lead, Pipeline, Preventivi, Offerte, Contratti, Opportunità, Attività, Email, Telefonate, Timeline, Scheda cliente, Dashboard CRM).
