# AIOS Product Bible
## Modulo 2 — AI Chat & Business Brain Interface

**Stato:** Bozza per approvazione
**Dipende da:** Design System, Home Dashboard (approvati)
**Prossimo modulo dopo approvazione:** Navigazione (Sidebar, Topbar, Command Palette) oppure Accesso — da confermare

---

## 1. Filosofia della Chat

### 1.1 Cos'è, definito in negativo prima che in positivo

Prima di dire cosa è la Chat, fisso cosa **non** è, perché è la fonte più comune di errore progettuale in questo tipo di prodotto: non è una finestra di supporto clienti, non è un layer sopra il software "per chi non trova il bottone giusto", non è un'aggiunta sperimentale isolata dal resto. È **un modo alternativo e completo di usare tutto AIOS**, non un sottoinsieme ridotto delle funzionalità.

Questo si traduce in un requisito tecnico-progettuale preciso, già anticipato nella Costituzione: se un'azione esiste come bottone in un modulo ma non è invocabile dalla Chat, quel modulo non è finito. La Chat non "recupera in ritardo" le funzionalità dei moduli — nasce insieme a ognuna.

### 1.2 Perché sarà percepita diversamente da ChatGPT/Claude/Copilot

Un assistente conversazionale generico risponde bene perché sa molte cose in generale. AIOS Chat deve risultare superiore per un motivo specifico e diverso: **sa poche cose, ma sa esattamente le tue**, e — punto distintivo — **può agire**, non solo descrivere. La differenza percepita dall'utente non è "questa AI è più intelligente", è "questa AI conosce davvero la mia azienda e può davvero fare le cose al posto mio, con il mio controllo".

### 1.3 Il paradosso da risolvere in ogni schermata di questo modulo

Più la Chat diventa potente (può creare, modificare, inviare, eliminare), più cresce il rischio percepito di perdere il controllo. Ogni decisione di questo documento risolve lo stesso conflitto: **potenza ed espansione delle capacità da un lato, fiducia e controllo percepito dall'altro** — e nella Product Bible di AIOS, quando i due sono in conflitto reale, **vince sempre il controllo umano**, mai la comodità dell'automazione.

---

## 2. Layout completo

### 2.1 Struttura a tre colonne (desktop), coerente con la Home

```
┌──────────┬────────────────────────────────────┬──────────────┐
│          │  TOOLBAR (agente attivo, stato, ⋯)  │              │
│ SIDEBAR  ├────────────────────────────────────┤              │
│          │                                     │  CONTEXT     │
│ Conver-  │         AREA MESSAGGI                │  PANEL       │
│ sazioni  │      (scrollabile, storico)          │              │
│ Cartelle │                                     │  - Fonti     │
│ Preferiti│                                     │  - Agenti    │
│ Ricerca  ├────────────────────────────────────┤  coinvolti   │
│          │  PROMPT BOX + Suggested Actions      │  - Memoria   │
│          │  (allegati, voce, invio)              │  usata       │
└──────────┴────────────────────────────────────┴──────────────┘
```

Questa è **la stessa griglia strutturale della Home** (sidebar di navigazione globale + colonna centrale + pannello contestuale a destra) — non una schermata "diversa", ma la stessa impalcatura applicata a un contenuto diverso. Coerenza spaziale = fiducia, principio già stabilito nel Design System.

### 2.2 Sidebar Chat (sinistra, distinta dalla sidebar di navigazione globale)

Attenzione a una distinzione critica: la sidebar di navigazione globale (CRM, Finance...) resta sempre presente e collassata a icone quando si è nella Chat a schermo intero; **dentro** l'area Chat esiste una seconda sidebar, più stretta, dedicata alle conversazioni:

- **Nuova conversazione** (pulsante in cima, sempre visibile, scorciatoia `Cmd/Ctrl+Shift+N`).
- **Preferiti** — conversazioni fissate manualmente (es. una conversazione ricorrente con l'Executive Agent per il check settimanale).
- **Cartelle** — raggruppamento manuale (es. "Trattative Q2", "HR"), create dall'utente, mai imposte dal sistema.
- **Cronologia recente** — ultime conversazioni, raggruppate per Oggi/Ieri/Questa settimana/Più vecchie, con anteprima dell'ultimo messaggio.
- **Ricerca conversazioni** — in cima, sempre accessibile, cerca sia nei titoli sia nel contenuto dei messaggi (ricerca semantica sul Business Brain, non solo full-text).

Ogni conversazione ha un **titolo generato automaticamente** dal primo scambio significativo (mai "Nuova conversazione 14"), rinominabile manualmente.

### 2.3 Area messaggi

Bolle di messaggio distinte per mittente: utente a destra (stile Design System, sfondo neutro pieno), AIOS a sinistra (sfondo `bg-surface`, **mai** il gradiente AI a piena bolla — il gradiente è riservato a elementi puntuali come card di suggerimento e Suggested Actions, per non affaticare la lettura di conversazioni lunghe con troppo colore).

Ogni messaggio di AIOS può contenere, nello stesso blocco: testo, una card dati (tabella, grafico), una o più **Suggested Actions** (pulsanti azione concreti), e un link "Spiega" (vedi sezione 8). Questo è un contratto fisso, mai un messaggio che è "solo testo" quando in realtà ci sarebbe un'azione sensata da proporre.

### 2.4 Toolbar (sopra l'area messaggi)

Mostra: **agente attivo o "AIOS" generico** (se la richiesta non è ancora stata instradata a un dominio specifico), **stato di elaborazione** (vedi 2.7), e un menu `⋯` con: Esporta conversazione, Condividi con team, Elimina.

### 2.5 Prompt Box

Elemento più importante dell'intera schermata, quindi il più curato:

- Campo di testo espandibile (da una riga a multi-riga automaticamente, mai un textarea a altezza fissa che tronca la vista di ciò che si sta scrivendo).
- Icona allegato (sezione 9) a sinistra.
- Icona microfono (sezione voce, Modulo futuro dedicato — qui solo l'innesto nella Chat) a destra del testo.
- Pulsante invio, disabilitato finché il campo è vuoto, sempre lo stesso pattern di stato del Design System.
- **Suggested Prompts** sopra il campo, solo quando la conversazione è vuota o appena conclusa un task (mai sovrapposti a una conversazione attiva) — 3-4 suggerimenti contestuali basati sul modulo da cui si è aperta la Chat e sul ruolo dell'utente (coerente con la logica di personalizzazione per ruolo già stabilita in Home).

### 2.6 Context Panel (destra)

Il pannello che rende AIOS "verificabile invece che magica". Tre sezioni verticali, sempre presenti quando pertinenti alla conversazione in corso:

1. **Fonti consultate** — elenco puntuale di documenti/record del Business Brain usati per l'ultima risposta, ciascuno cliccabile per aprirlo.
2. **Agenti coinvolti** — se più di un agente ha collaborato (sezione 6), un piccolo elenco con icona per ciascuno.
3. **Memoria utilizzata** — quale livello di memoria (sezione 4) ha contribuito al contesto di questa risposta specifica.

Questo pannello **si aggiorna ad ogni messaggio**, non resta statico sull'ultima risposta di apertura — riflette sempre l'ultimo scambio.

### 2.7 Stato AI — indicatori di elaborazione

Non un semplice "..." generico. Tre stati testuali brevi, coerenti col principio di trasparenza:
- *"Sto cercando nei tuoi dati..."* (fase di retrieval)
- *"Sto ragionando..."* (fase di generazione/orchestrazione multi-agente)
- *"Sto eseguendo: [azione specifica]..."* (fase di esecuzione di un Tool, sezione 7)

Questi tre stati sono **mostrati esplicitamente in sequenza quando rilevanti**, mai un caricamento anonimo: l'utente vede sempre a che punto è il ragionamento, coerente col principio Explainability First anche durante l'attesa, non solo a risposta conclusa.

### 2.8 Memory Panel — quando e come appare

Non un pannello sempre visibile (affollerebbe l'interfaccia): è raggiungibile da un'icona nella Toolbar, si apre come pannello a scomparsa sopra il Context Panel, e mostra — in linguaggio naturale, mai come dump tecnico — cosa AIOS "ricorda" di rilevante per questa conversazione specifica (es. "Ricordo che a marzo abbiamo parlato di uno sconto per questo cliente, non ancora confermato").

### 2.9 Responsive

- **Tablet:** Sidebar conversazioni collassabile a icona, Context Panel diventa un tab raggiungibile sopra l'area messaggi invece di colonna fissa.
- **Mobile:** La Chat diventa **l'interfaccia primaria dell'intera app** (coerente con quanto già anticipato nel Modulo Home) — schermo intero, sidebar conversazioni raggiungibile con uno swipe o un pulsante dedicato, Context Panel raggiungibile come schermata secondaria tramite un'icona "ⓘ" sopra ogni risposta, mai sacrificato del tutto (la spiegabilità non è un lusso da desktop).

---

## 3. Esperienza conversazionale

### 3.1 Primo messaggio (utente nuovo, prima conversazione in assoluto)

AIOS non aspetta passivamente. Il primo messaggio è generato da AIOS stessa, personalizzato sul ruolo e sul poco che si sa già dell'azienda (dati inseriti in onboarding): *"Ciao [nome], sono AIOS. Posso aiutarti a [2-3 esempi concreti basati sul ruolo]. Da cosa vuoi iniziare?"* — mai un semplice "Come posso aiutarti oggi?" generico, che è il pattern più abusato e meno utile dell'intero settore.

### 3.2 Continuità tra conversazioni

Ogni conversazione ha un contesto proprio (memoria di sessione, Costituzione sez. 3), ma l'utente può fare riferimento a informazioni discusse altrove ("il cliente di cui parlavamo ieri") — questo funziona perché il Business Brain, non la singola conversazione, è la fonte di verità: AIOS cerca prima nel Knowledge Graph e nella memoria operativa, e solo se davvero necessario chiede di specificare.

### 3.3 Cambio di argomento e di contesto

Un cambio di argomento brusco nella stessa conversazione (da "creami un preventivo" a "quante ferie ha maturato Mario?") viene gestito senza attrito: l'Agent Orchestrator (Costituzione, sez. 2) instrada silenziosamente il nuovo intento al Finance/Sales Agent nel primo caso, all'HR Agent nel secondo, **senza richiedere all'utente di "aprire un'altra conversazione"**. L'indicatore di agente attivo nella Toolbar (2.4) cambia di conseguenza, in modo visibile ma non invadente.

### 3.4 Domande chiarificatrici — quando e come

AIOS chiede chiarimenti solo quando l'ambiguità cambierebbe materialmente il risultato (es. due clienti con lo stesso nome), mai per pigrizia del sistema. La domanda è sempre puntuale e con opzioni pre-costruite cliccabili quando possibile ("Intendi Rossi Srl (Milano) o Rossi Snc (Torino)?" con due pulsanti), mai una domanda aperta quando una scelta chiusa risolverebbe il problema più velocemente.

### 3.5 Follow-up automatici

Se un'azione richiede un tempo di completamento (es. un Tool asincrono, sezione 7), AIOS non lascia la conversazione "in sospeso silenzioso": un messaggio di follow-up arriva quando il risultato è pronto, anche se l'utente ha nel frattempo lasciato la Chat aperta su un'altra conversazione (notifica coerente col Centro Notifiche della Home).

---

## 4. Memoria — architettura conversazionale

Estendo qui il modello a quattro livelli della Costituzione con due dimensioni aggiuntive specifiche della Chat: memoria **personale** vs **di team**.

| Tipo di memoria | Cosa contiene | Quando si aggiorna | Quando si "dimentica" |
|---|---|---|---|
| **Sessione** | Contesto della conversazione aperta ora | Ad ogni messaggio | Alla chiusura/timeout (Costituzione, 30 min) |
| **Personale** | Preferenze e pattern dell'utente specifico (es. "preferisce risposte brevi", "chiede spesso report il lunedì") | Osservata nel tempo, mai dichiarata esplicitamente dall'utente | Non si elimina automaticamente; modificabile/cancellabile da Settings |
| **Aziendale** | Dati oggettivi dell'azienda (clienti, ordini...) | Ad ogni evento aziendale (Business Brain) | Segue le policy di retention del Business Brain, non della Chat |
| **Di team** | Convenzioni condivise da un gruppo di utenti (es. "il team commerciale chiama sempre 'trattativa calda' un'opportunità sopra i 10.000€") | Quando più utenti nello stesso team confermano lo stesso pattern | Rivedibile da un amministratore di team |
| **Documentale** | Contenuto indicizzato di allegati e documenti (sezione 9) | Al caricamento/aggiornamento del documento | Segue il ciclo di vita del documento stesso in AIOS Docs |
| **Strategica** | Pattern aggregati di lungo periodo (Company DNA, Costituzione sez. 1.3) | Ricalcolo periodico batch | Mai "dimenticata", solo aggiornata |
| **Degli agenti** | Stato interno di un agente su un task multi-step in corso (non un ricordo di lungo periodo, ma uno stato di lavoro) | Durante l'esecuzione di un task complesso | Eliminata al completamento o fallimento del task |

### 4.1 Come si evitano duplicazioni

Ogni informazione ha **un solo livello che ne è "proprietario"** — un dato oggettivo aziendale non viene mai copiato nella memoria personale per comodità di accesso: la memoria personale contiene solo *riferimenti* a pattern di comportamento, mai una copia dei dati stessi. Questo evita il problema classico di due fonti che nel tempo divergono silenziosamente.

---

## 5. Come la Chat dialoga con il Business Brain

Flusso già descritto in astratto nella Costituzione (sezione 4, Prompt Orchestrator); qui lo specifichiamo dal punto di vista dell'esperienza in Chat:

1. Il messaggio dell'utente viene classificato (domanda informativa vs comando che richiede un'azione).
2. Il Context Retrieval interroga il Business Brain — **mai l'intero storico**, solo ciò che serve per questo messaggio specifico (principio già stabilito).
3. Se la domanda richiede conoscenza che semplicemente non esiste ancora nel Business Brain (es. un'azienda nuova, poco storico), AIOS lo dichiara esplicitamente invece di generalizzare: *"Non ho ancora dati sufficienti su questo — è tra le prime settimane di utilizzo."*
4. Ogni nuova informazione che emerge dalla conversazione stessa (es. l'utente conferma un dato non ancora registrato: "sì, in realtà quel cliente preferisce essere contattato via WhatsApp") viene **scritta nel Business Brain**, non solo ricordata nella sessione — la Chat è anche un punto di **ingresso** di conoscenza, non solo di consultazione.

### 5.1 Come si evitano risposte incoerenti tra un modulo e la Chat

Poiché sia l'interfaccia grafica dei moduli sia la Chat leggono dallo stesso Business Brain attraverso lo stesso set di Tools (mai due percorsi dati paralleli), un dato mostrato nella dashboard di Finance e un dato riportato dalla Chat sono strutturalmente la stessa query, non due implementazioni che potrebbero divergere.

---

## 6. AI Agent — comportamento in Chat

### 6.1 Catalogo esteso (rispetto alla Costituzione, ora completo)

Ai sei agenti core si aggiungono, per questo modulo, quattro agenti aggiuntivi esplicitamente richiesti:

| Agente | Dominio | Quando entra in gioco |
|---|---|---|
| Legal Agent | Contratti, clausole, scadenze legali | Domande su contratti, verifica compliance documentale |
| Marketing Agent | Campagne, contenuti, ROI marketing | Richieste su campagne attive, performance |
| Customer Care Agent | Ticket, reclami, soddisfazione cliente | Gestione assistenza, storico reclami |
| Analytics Agent | Analisi trasversali, forecasting | Domande che richiedono aggregazione cross-modulo |

### 6.2 Quando gli agenti restano invisibili

**Regola di base: l'utente parla con "AIOS", non con un elenco di agenti da scegliere.** Il nome dell'agente compare nella Toolbar (2.4) e nel Context Panel (2.6) come informazione di trasparenza, ma non è mai richiesto all'utente di "selezionare l'agente giusto" — sarebbe un attrito che tradisce la promessa "AI First" del prodotto. L'utente vede quale agente ha risposto solo se lo cerca (principio di spiegabilità disponibile ma non imposta).

### 6.3 Collaborazione multi-agente percepita

Quando più agenti collaborano su una richiesta (es. l'esempio della Costituzione: preventivo + verifica magazzino), l'utente non vede una sequenza confusa di "agente 1 dice... agente 2 dice..." — vede **una risposta unica e coerente**, con il Context Panel che elenca "Agenti coinvolti: Sales, Inventory" per chi vuole approfondire. La sintesi tra le risposte parziali degli agenti è responsabilità dell'Agent Orchestrator, mai esposta come conflitto grezzo all'utente.

### 6.4 Risoluzione dei conflitti tra agenti

Se due agenti restituiscono informazioni in apparente contraddizione (es. Sales Agent propone uno sconto che Finance Agent segnala come sotto la soglia di margine minimo), il conflitto **non viene nascosto né risolto silenziosamente a favore di uno dei due**: viene presentato esplicitamente all'utente come una tensione da decidere: *"Il Sales Agent propone uno sconto del 15% per chiudere la trattativa. Il Finance Agent segnala che porterebbe il margine sotto la soglia minima del 20%. Come vuoi procedere?"* con opzioni chiare. Questo è coerente con "vince sempre il controllo umano" (sezione 1.3).

---

## 7. Tool Calling

### 7.1 Principio di progettazione

Ogni Tool ha lo stesso identico contratto di interazione, indipendentemente dal modulo a cui appartiene — un utente che ha imparato come funziona "crea un preventivo" sa già come funzionerà "crea un ordine fornitore", perché la meccanica di conferma, esecuzione ed errore è unica in tutta la piattaforma.

### 7.2 Il ciclo UX di ogni Tool (i quattro passaggi sempre uguali)

```
1. PROPOSTA     → AIOS mostra cosa farebbe, in linguaggio naturale + anteprima dati
2. CONFERMA     → livello richiesto secondo il motore di autorizzazioni 
                  (Costituzione, sez. 5): nessuna / un click / conferma esplicita
3. ESECUZIONE   → indicatore di stato (2.7), mai una barra di progresso anonima
4. ESITO        → conferma con link diretto al risultato (es. "Preventivo #2299 
                  creato" → cliccabile, apre il documento) + opzione di annullamento
                  quando tecnicamente possibile (rollback, vedi 7.4)
```

### 7.3 Elenco dei Tool core e note di autorizzazione specifiche

| Tool | Livello di rischio | Nota UX specifica |
|---|---|---|
| Creare cliente | Basso | Esecuzione diretta nella maggior parte dei casi |
| Creare preventivo | Medio | Soglia di importo configurabile (Costituzione, 5.2) |
| Modificare ordine | Medio | Mostra sempre il "prima/dopo" nella proposta |
| Inviare email | Medio-alto | Anteprima completa del testo obbligatoria prima dell'invio, mai invio diretto senza visualizzazione |
| Inviare WhatsApp | Medio-alto | Come email — canale diretto verso il cliente, mai automatico silenzioso |
| Creare fattura | Alto | Sempre soggetta a conferma esplicita, documento fiscale |
| Aggiornare magazzino | Medio | Mostra l'impatto su eventuali ordini in corso prima di confermare |
| Creare task/meeting | Basso | Esecuzione diretta con possibilità di modifica immediata |
| Eseguire un workflow (AIOS Flow) | Variabile | Eredita il livello di rischio più alto tra i passi che contiene |

### 7.4 Rollback

Ogni Tool dichiara esplicitamente, nel proprio manifest tecnico (coerente con l'architettura a manifest del Marketplace, Costituzione sez. 8), se è **reversibile** (es. modifica dati interni: sì) o **irreversibile per natura** (es. invio email: il messaggio è partito, non si può "richiamare"). Per i Tool reversibili, l'esito (7.2, passo 4) include sempre un'azione "Annulla" per una finestra di tempo configurabile (default 30 secondi per azioni immediate, illimitato per modifiche dati fino a conferma successiva). Per i Tool irreversibili, questo viene comunicato **prima** dell'esecuzione, non scoperto dopo: la fase di conferma (7.2, passo 2) per un'azione irreversibile usa sempre il pattern di conferma esplicita più alto (Design System, 6.3), mai un semplice click.

### 7.5 Gestione errori di un Tool

Se un Tool fallisce (es. l'integrazione email esterna non risponde), AIOS non ripete il tentativo silenziosamente all'infinito né finge che sia andato a buon fine: comunica il fallimento in linguaggio chiaro, propone un'alternativa quando esiste ("Non sono riuscito a inviare l'email — vuoi che la salvi come bozza per un invio manuale?"), e registra l'errore nel Business Brain per eventuale diagnosi tecnica, senza esporre dettagli tecnici grezzi (stack trace, codici HTTP) all'utente finale.

---

## 8. Explainability — la UX del "Perché?"

### 8.1 Struttura fissa (già anticipata in Home, qui è dove nasce)

Ogni risposta sostanziale di AIOS (non un semplice "ok" conversazionale) porta, in coda al messaggio, un link testuale discreto **"Perché questa risposta?"**. Cliccandolo, si espande inline (mai un nuovo modale che interrompe la lettura) un blocco strutturato sempre nello stesso ordine:

1. **Cosa ho capito** — riformulazione sintetica dell'intento rilevato.
2. **Cosa ho consultato** — elenco puntuale delle fonti (documenti, record, conversazioni precedenti), ciascuna cliccabile.
3. **Chi ha risposto** — quale agente/i (sezione 6).
4. **Quanto sono sicuro** — un indicatore di affidabilità a tre livelli testuali (non un percentuale finta e pseudo-precisa): **Alta** (dati diretti e recenti), **Media** (dati parziali o meno recenti, informazione dedotta), **Bassa** (informazione insufficiente, risposta parzialmente ipotetica — in questo caso AIOS lo dichiara comunque nel testo principale della risposta, non solo nel dettaglio nascosto).

### 8.2 Perché mai un punteggio percentuale

Un'affidabilità dichiarata come "87%" comunica una falsa precisione matematica che il modello linguistico non possiede realmente, e nel tempo eroderebbe la fiducia quando gli utenti scoprissero l'arbitrarietà del numero. Tre livelli qualitativi onesti costruiscono più fiducia di un numero preciso ma ingannevole.

---

## 9. Multimodalità

### 9.1 Principio unificante

Ogni tipo di contenuto allegato (PDF, Word, Excel, PowerPoint, immagine, email, screenshot, audio, video) **entra nello stesso Business Brain e viene trattato con lo stesso rispetto conversazionale** — l'utente non deve mai pensare "questo tipo di file la Chat non lo capisce bene". Dietro le quinte, ogni formato ha una pipeline di estrazione dedicata (OCR per immagini/scansioni, parsing strutturato per Excel, trascrizione per audio/video), ma l'esperienza in Chat è identica: si trascina o allega il file, AIOS conferma di averlo "letto" con un breve riepilogo prima di rispondere nel merito.

### 9.2 UX dell'allegato

Anteprima immediata in Chat (thumbnail per immagini/PDF, icona + nome file per altri formati), mai un semplice link scaricabile senza contesto. Dopo l'elaborazione (indicatore di stato coerente con 2.7: *"Sto leggendo il documento..."*), AIOS può rispondere su di esso immediatamente nello stesso messaggio dell'utente, senza richiedere un secondo passaggio.

### 9.3 Indicizzazione nel Business Brain

Ogni documento allegato in Chat viene automaticamente indicizzato in AIOS Docs (vettorizzato per ricerca semantica, collegato all'entità pertinente nel Knowledge Graph — es. un PDF allegato durante una conversazione sul cliente Rossi viene collegato alla scheda di quel cliente), così che diventi trovabile in futuro anche fuori da quella conversazione specifica.

### 9.4 Grafici e tabelle in uscita

Quando AIOS genera una risposta con dati numerici, la Chat non produce solo testo: genera una card interattiva (tabella ordinabile, grafico con valori in etichetta, coerente col Design System sezione 6.5) inline nel messaggio, esportabile con un click.

---

## 10. Automazioni create in linguaggio naturale

### 10.1 Il flusso conversazionale di creazione

Utente: *"Ogni lunedì mattina inviami il report vendite."*

AIOS non esegue subito un'interpretazione muta: risponde confermando la comprensione in modo esplicito e proponendo l'anteprima della regola creata, prima di attivarla:

> *"Ho impostato: ogni lunedì alle 8:00, ti invierò un riepilogo delle vendite della settimana precedente, via [canale di default: notifica in-app + email]. Vuoi modificare qualcosa prima di attivarla?"*
> `[Attiva così] [Modifica orario] [Modifica contenuto]`

### 10.2 Dove vivono le automazioni create dalla Chat

Ogni automazione creata conversazionalmente **non resta "nascosta" nella chat che l'ha generata** — compare nel modulo AIOS Flow (Costituzione, sez. 8 tecnica; modulo prodotto dedicato più avanti nella Product Bible) come una regola a tutti gli effetti, modificabile anche visualmente da lì. La Chat è un modo di *creare* automazioni, non un luogo separato dove *vivono*.

### 10.3 Automazioni condizionali complesse

*"Se un cliente non risponde per 7 giorni, crea un promemoria"* — AIOS traduce questo in una regola con trigger (assenza di risposta per N giorni), condizione (cliente specifico o categoria), azione (creazione task). Se la richiesta è ambigua su un parametro rilevante (quale canale conta come "risposta"? email, telefonata, entrambi?), questo è uno dei casi in cui la domanda chiarificatrice (sezione 3.4) è doverosa, non facoltativa — un'automazione mal interpretata ha conseguenze silenziose e ripetute nel tempo, più gravi di un errore in una singola risposta conversazionale.

---

## 11. Gestione degli errori

| Situazione | Comportamento di AIOS |
|---|---|
| Non conosce la risposta | Lo dichiara esplicitamente: *"Non ho questa informazione nei dati disponibili."* Mai una risposta plausibile ma inventata. |
| Dati insufficienti | Spiega cosa manca e, quando possibile, chi/cosa potrebbe fornirlo: *"Non ho ancora lo storico ordini di questo fornitore — è stato aggiunto di recente."* |
| Un Tool fallisce | Vedi 7.5 — comunicazione chiara, alternativa se disponibile. |
| Un Agent fallisce (es. timeout nel ragionamento) | Messaggio di scuse funzionale, non colpevolizzante, con opzione di riprovare: *"Non sono riuscito a completare l'analisi — vuoi che ci riprovi?"* |
| Un'integrazione esterna non risponde | Distingue chiaramente "problema mio" da "problema del servizio esterno" quando identificabile, per non generare sfiducia ingiustificata verso AIOS per un disservizio di terzi. |
| Conflitto tra informazioni | Mai risolto silenziosamente — vedi 6.4, stesso principio si applica anche fuori dal contesto multi-agente (es. due documenti con dati contrastanti sullo stesso cliente vengono segnalati entrambi, non scelto uno a caso). |

---

## 12. Scenari reali

### CEO chiede un report aziendale
*"Come sta andando l'azienda questo mese?"* → Intent classificato come richiesta aggregata → Analytics Agent ed Executive Agent collaborano → Context Retrieval su memoria operativa (mese corrente) e strategica (confronto storico) → risposta sintetica in 4-5 frasi con una card KPI inline, non un report di dieci pagine incollato in chat.

### Commerciale crea un preventivo
*"Preventivo per Bianchi Srl, 100 unità prodotto Gamma, sconto standard"* → Sales Agent verifica listino e storico cliente → propone il preventivo con anteprima → conferma richiesta (livello secondo soglia) → una volta approvato, Tool esegue, CRM e Inventory si aggiornano via Business Brain, non via chiamate dirette tra moduli.

### CFO analizza il cash flow
*"Perché il cash flow previsto è peggiorato rispetto a ieri?"* → Finance Agent + Analytics Agent → risposta con causa specifica identificata (es. un pagamento fornitore anticipato) e link diretto al movimento — mai una risposta vaga tipo "ci sono state variazioni".

### HR pianifica ferie
*"Chi ha richiesto ferie ad agosto e chi devo ancora approvare?"* → HR Agent → tabella inline con azioni rapide "Approva/Rifiuta" direttamente nel messaggio, senza dover aprire il modulo HR.

### Magazziniere controlla le scorte
Da mobile, spesso a voce (anticipando il modulo Voice): *"Quanto Beta abbiamo ancora?"* → Inventory Agent → risposta brevissima e diretta, ottimizzata per ascolto rapido in movimento, non per lettura su schermo.

### Imprenditore da smartphone
La Chat è l'unica superficie usata per l'80% delle interazioni mobile (coerente con Home, scenario mobile) — messaggi più brevi di default su mobile, Suggested Actions ridotte alle 1-2 più probabili invece delle 3-4 di desktop, per adattarsi allo spazio e al contesto d'uso "in piedi, tra un impegno e l'altro".

---

## 13. AI Personality

### 13.1 Tratti fissi, indipendenti dal contesto

- **Diretta, mai prolissa.** Una risposta di tre frasi ben scelte batte sempre un paragrafo esaustivo ma dispersivo.
- **Sicura ma mai arrogante.** Dichiara apertamente incertezza (sez. 8.2) invece di proiettare falsa sicurezza.
- **Rispettosa del tempo dell'utente.** Non fa small talk non richiesto, non si scusa eccessivamente, non ripete informazioni già fornite nella stessa conversazione.
- **Proattiva ma mai invadente.** Suggerisce, non impone (coerente con tutta la Product Bible finora).

### 13.2 Quando interrompe (mai, in un senso stretto) e quando prende iniziativa

AIOS non interrompe mai un input dell'utente mentre sta scrivendo. Prende iniziativa **solo su invito implicito del contesto**: dopo aver completato un'azione, può proporre il passo logico successivo ("Preventivo inviato. Vuoi che imposti un promemoria di follow-up tra 4 giorni?") — mai iniziare un argomento nuovo non richiesto all'interno di una conversazione già a tema.

### 13.3 Come costruisce fiducia nel tempo

La personalità non premia la "simpatia immediata": costruisce fiducia attraverso **coerenza ripetuta** — le stesse strutture di risposta (Suggested Actions, "Perché?", conferme) usate identiche per settimane fanno sì che l'utente sviluppi aspettative accurate su cosa succederà, che è la vera definizione operativa di fiducia in un sistema, più della simpatia del tono.

### 13.4 Comunicazione in situazioni critiche

Quando comunica un'anomalia grave (es. rischio di liquidità), il tono resta calmo e fattuale, mai allarmistico né minimizzante: fatti, impatto stimato, azione consigliata — nello stesso ordine sempre, per essere prevedibile anche (soprattutto) nei momenti di stress dell'utente.

---

## 14. Evoluzione futura — cosa progettare oggi per non dover riprogettare domani

- **Interazione vocale continua (non solo dettatura)**: l'architettura del Prompt Orchestrator deve già oggi trattare l'audio come un altro tipo di input multimodale (sez. 9), non un canale separato da integrare in futuro con un refactoring.
- **Agenti proattivi che iniziano conversazioni**: oggi l'AI risponde e propone nel contesto Home/Chat; un'evoluzione naturale è un agente che apre autonomamente una conversazione quando rileva qualcosa di sufficientemente rilevante. Il motore di autorizzazioni (Costituzione, sez. 5) è già progettato per supportare questo come un "livello di autonomia" aggiuntivo, non richiede una nuova architettura.
- **Collaborazione multi-utente nella stessa conversazione**: oggi ogni conversazione ha un utente; il modello dati (prossimo step) dovrà prevedere fin da subito la possibilità di più partecipanti umani in una conversazione con l'AI, anche se la UI di questo scenario non viene disegnata in questo modulo.
- **Personalizzazione della personalità AI entro limiti definiti**: alcune aziende Enterprise vorranno un tono più formale o un nome diverso per l'assistente — l'architettura del Prompt Orchestrator (system prompt centralizzato e versionato, Costituzione sez. 4.3) è già pronta a supportare varianti configurabili senza riscrivere la logica sottostante.

---

## 15. Conclusione

### Principi fondamentali stabiliti in questo modulo
1. La Chat è un modo completo di usare AIOS, non un sottoinsieme.
2. Ogni Tool condivide lo stesso ciclo UX a quattro fasi, senza eccezioni modulo per modulo.
3. Il conflitto tra potenza e controllo si risolve sempre a favore del controllo umano.
4. La spiegabilità ("Perché?") è una struttura fissa a quattro parti, mai riformulata liberamente.
5. Gli agenti restano invisibili di default; la trasparenza è disponibile su richiesta, non imposta.

### Decisioni architetturali prese
- Un solo Context Retrieval per messaggio, mai l'intero storico passato al modello.
- Le automazioni create in Chat vivono in AIOS Flow, non in un sistema parallelo.
- Affidabilità comunicata a tre livelli qualitativi, mai come percentuale.

### Decisioni rimandate (esplicitamente, non dimenticate)
- Il disegno dettagliato dell'interazione vocale continua (accennato in 14, da trattare come modulo dedicato).
- La UX di conversazioni multi-utente con l'AI.
- I dettagli di personalizzazione del tono per clienti Enterprise.

### Dipendenze con gli altri moduli della Product Bible
- **Home:** il Business Brain Panel e la Timeline condividono la stessa meccanica "Perché?" definita qui in dettaglio.
- **Navigazione (prossimo modulo):** la Command Palette dovrà offrire "Chiedi ad AIOS" come azione universale sempre presente.
- **Ogni modulo applicativo (CRM, Finance...):** ogni Tool descritto qui in astratto verrà elencato in dettaglio, con i campi specifici, nel modulo corrispondente.

### Impatto sul database (da trattare nello Step di modello dati)
Servirà uno schema esplicito per: conversazioni, messaggi, allegati (con riferimento al documento indicizzato in Docs), stato delle automazioni generate, log delle esecuzioni di Tool con esito e possibilità di rollback.

### Impatto sulle API
Ogni Tool descritto in sezione 7 corrisponde a un'azione dell'API pubblica versionata (Step 1, sez. 22) — nessun Tool interno alla Chat che non sia anche un'azione API richiamabile da un plugin del Marketplace, coerente col principio "un solo modo per fare ogni cosa" applicato anche a livello di piattaforma, non solo di interfaccia.

### Impatto sul Business Brain
Conferma dell'architettura a tre strutture (Event Log, Knowledge Graph, memoria semantica) della Costituzione: nessuna modifica richiesta, la Chat ne è semplicemente il consumatore ed alimentatore più intenso.

### Impatto su sviluppo frontend e mobile
Il layout a tre colonne condiviso con la Home permette un riuso significativo di componenti (Context Panel, indicatori di stato AI); su mobile, la Chat a schermo intero richiede però un lavoro di adattamento specifico per Suggested Actions e Context Panel come schermate separate, da pianificare come sforzo dedicato e non sottostimare nella stima di sviluppo.

---

## Prossimo modulo (in attesa di approvazione)

Con la Chat AI approvata, il modulo successivo naturale è **Navigazione** (Sidebar, Topbar, Command Palette, Ricerca universale, Menu contestuali, Sistema notifiche) — è il modulo che "tiene insieme" Home e Chat con tutto il resto della piattaforma. Fammi sapere se procedo in questo ordine o se preferisci **CRM** subito, dato che è il modulo applicativo più atteso.
