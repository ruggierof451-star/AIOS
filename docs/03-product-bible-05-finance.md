# AIOS Product Bible
## Modulo 5 — AI Finance (Financial Intelligence)

**Stato:** Bozza per approvazione
**Dipende da:** Design System, Home Dashboard, AI Chat, Navigation, AI CRM (approvati)
**Prossimo modulo dopo approvazione:** Inventory

---

## 1. Filosofia del modulo Finance

### 1.1 Perché un gestionale finanziario tradizionale non basta

Un software di contabilità classico risponde bene a "cosa è successo" (questa fattura è stata emessa, questo pagamento è stato registrato) ma quasi mai a "cosa significa" e "cosa succederà". L'interpretazione — se la liquidità reggerà i prossimi tre mesi, se questo cliente sta diventando un rischio, se questo prodotto sta erodendo margine — resta un lavoro manuale del commercialista o del CFO, spesso fatto con un foglio Excel a parte, scollegato dal gestionale stesso.

**Finance AI-native inverte il rapporto**: il sistema costruisce continuamente l'interpretazione sopra i dati contabili, e la rende disponibile in linguaggio naturale a chiunque ne abbia titolo — senza sostituire il giudizio professionale di un commercialista, ma eliminando il lavoro manuale di ricostruzione che oggi consuma la maggior parte del tempo prima ancora di arrivare a una vera decisione.

### 1.2 Un vincolo che non esiste negli altri moduli: l'accuratezza è superiore alla fluidità

In CRM, un suggerimento leggermente impreciso su "quale cliente contattare oggi" ha un costo basso. In Finance, un dato economico sbagliato ha conseguenze fiscali, legali e di fiducia. Per questo motivo, in questo modulo — a differenza di tutti i precedenti — **un dato oggettivo (importo di una fattura, saldo di un conto) non è mai generato o "arrotondato" dall'AI**: l'AI interpreta, spiega, prevede, ma ogni numero certo proviene sempre da una fonte verificabile (documento, transazione bancaria, registrazione contabile), mai da un'inferenza del modello linguistico. Solo le **previsioni** (forecast, sezione 8) sono esplicitamente dichiarate come stime, mai confuse con dati consuntivi.

### 1.3 Come cambia il lavoro di CFO e amministrazione

Oggi: l'amministrazione inserisce dati, il CFO li estrae in un foglio separato per costruire un'analisi, spesso settimane dopo che i fatti sono accaduti. Con AIOS: l'analisi esiste in tempo reale, continuamente aggiornata, e il tempo del CFO si sposta dalla costruzione del report alla decisione basata sul report — la stessa trasformazione già descritta per il commerciale nel Modulo CRM, qui applicata alla funzione finanziaria.

---

## 2. Dashboard Finance

### 2.1 Principio di selezione — gerarchia di priorità

Ordine verticale, stessa disciplina di Home e CRM:

1. **Anomalie e rischi urgenti** (es. "Liquidità prevista negativa tra 18 giorni se non intervieni")
2. **Liquidità disponibile** (saldo di cassa consolidato su tutti i conti collegati) e **Cash flow previsto 30gg**, affiancati come coppia inseparabile — la liquidità attuale senza la proiezione a breve è un dato incompleto per decidere
3. **KPI per ruolo** (4 card: per CFO — Margine medio, Crediti da incassare, Debiti da pagare, EBITDA; per CEO — Fatturato mese, Margine, Liquidità, Utile netto stimato)
4. **Ricavi vs Costi** (confronto sintetico del periodo corrente)
5. **Suggerimenti del Finance Agent**
6. **Fatture in scadenza / insoluti** in sintesi (dettaglio completo nel modulo Fatture, sezione 4)

### 2.2 EBITDA — quando mostrarlo e come

L'EBITDA è mostrato solo se l'azienda ha configurato una struttura di costi sufficientemente dettagliata da calcolarlo con significato (non stimato "alla meglio" con dati insufficienti) — se mancano i dati necessari, la card mostra esplicitamente "Dati insufficienti per calcolare l'EBITDA" con un link a cosa serve completare, mai un numero approssimativo presentato come se fosse solido.

### 2.3 Ogni elemento è spiegabile e collegato

Coerente con tutta la Product Bible: click su liquidità apre il dettaglio movimenti; click su margine apre la scomposizione per prodotto/cliente (sezione 7); nessun numero è un vicolo cieco.

---

## 3. Preventivi

### 3.1 Relazione con il CRM — un solo oggetto, due punti di vista

Il preventivo non è un'entità duplicata tra CRM e Finance: è **lo stesso oggetto**, creato tipicamente dal Sales Agent (Modulo CRM, sezione 8) e gestito qui dal punto di vista della sua evoluzione economica (versioni, margine, approvazione). Questo evita il problema classico di due sistemi con "il loro" preventivo che divergono nel tempo.

### 3.2 Versioni e storico modifiche

Ogni modifica a un preventivo (cambio sconto, quantità, condizioni) crea una nuova versione visibile in uno storico lineare, mai una sovrascrittura silenziosa — necessario sia per motivi commerciali (capire come si è arrivati al prezzo finale) sia di auditabilità (principio cardine di questo modulo, sezione 1.2).

### 3.3 Analisi del margine in tempo reale durante la creazione

Mentre si compone un preventivo (manualmente o tramite il Sales Agent), il margine stimato è mostrato **in tempo reale accanto al totale**, mai calcolato solo a documento salvato — se uno sconto proposto porta il margine sotto la soglia minima configurata, l'interfaccia lo segnala immediatamente con lo stesso trattamento visivo di anomalia usato altrove (Design System, colori semantici).

### 3.4 Approvazione

Coerente col motore di autorizzazioni (Costituzione, sezione 5): un preventivo sopra soglia richiede conferma esplicita prima dell'invio, con il "prima/dopo" del margine ben visibile a chi approva.

### 3.5 Conversione in ordine

Un click, con verifica automatica di coerenza (il preventivo accettato genera un ordine con gli stessi identici termini, mai una ridigitazione manuale che introduce rischio di errore trascrittivo).

---

## 4. Fatture

### 4.1 Emissione

Generazione automatica da un ordine confermato (collegamento diretto, coerente con l'architettura event-driven dello Step 1) o creazione manuale. Ogni fattura emessa è, per sua natura, un documento fiscale: **una volta emessa e trasmessa, non è mai modificabile** — solo integrabile con una nota di credito, coerente con la normativa e con il principio di auditability.

### 4.2 Ricezione (fatture passive)

Lettura intelligente del documento in ingresso (OCR + estrazione strutturata, coerente con la multimodalità del Modulo Chat, sezione 9): fornitore, importo, scadenza, categoria di costo riconosciuti automaticamente, **sempre presentati per conferma umana prima della registrazione contabile definitiva** — mai registrati automaticamente senza controllo, per lo stesso principio di accuratezza superiore alla fluidità (sezione 1.2).

### 4.3 Stato e ciclo di vita

Bozza → Emessa → Inviata → (Pagata parzialmente / Pagata / Scaduta / Insoluta) → eventualmente Nota di credito collegata. Ogni cambio di stato alimenta la Timeline del cliente/fornitore coinvolto (coerente col Modulo CRM).

### 4.4 Controllo di coerenza automatico

Il Finance Agent verifica automaticamente ogni fattura ricevuta contro l'ordine/contratto collegato quando esiste (importi coerenti? quantità coerenti?) e segnala scostamenti come anomalia da verificare — mai bloccando la registrazione, ma segnalando prima che diventi un problema scoperto solo in sede di revisione mensile.

### 4.5 Insoluti e note di credito

Un insoluto genera automaticamente un'attività di sollecito (con livello di autonomia configurabile — messaggio automatico per importi piccoli, sempre approvazione umana per importi rilevanti o clienti strategici, coerente col Modulo CRM RBAC). Le note di credito sono sempre esplicitamente collegate alla fattura originale, mai documenti isolati.

---

## 5. Pagamenti

### 5.1 Entrata e uscita, vista unificata

Un'unica timeline di movimenti attesi e confermati, in entrata e in uscita, non due sezioni separate — la liquidità si comprende solo guardando entrambi i flussi insieme.

### 5.2 Riconciliazione bancaria

Quando autorizzata l'integrazione bancaria (Step 1, cloud infrastructure — connessione sicura via provider certificato), ogni movimento bancario viene proposto per l'abbinamento automatico a una fattura/pagamento atteso, **con conferma dell'utente per i casi ambigui** (importo che non corrisponde esattamente, più fatture possibili per lo stesso importo) — abbinamento automatico silenzioso solo quando la corrispondenza è univoca e certa.

### 5.3 Scadenze e reminder

Vista calendario delle scadenze (in entrata e uscita), con reminder configurabili — coerente con il Modulo Calendar quando progettato, questo modulo ne alimenta gli eventi, non ne duplica la UI.

### 5.4 Gestione insoluti

Vedi 4.5. Il Finance Agent qui aggiunge una dimensione predittiva: segnala non solo gli insoluti già avvenuti ma clienti con un pattern di ritardo crescente **prima** che si trasformino in un vero insoluto, coerente col principio "prevenire, non solo registrare" del materiale di prodotto originario.

---

## 6. Cash Flow — il motore predittivo centrale del modulo

### 6.1 Vista principale

Grafico temporale con la situazione attuale e tre proiezioni a 30/90/180/365 giorni, sempre mostrate come **intervallo con tre scenari**, mai un'unica linea falsamente precisa:

- **Scenario conservativo:** ipotizza ritardi nei pagamenti in entrata secondo lo storico peggiore osservato, nessuna nuova vendita oltre la pipeline già molto probabile.
- **Scenario realistico** (evidenziato come predefinito): basato sui pattern medi storici del Business Brain.
- **Scenario ottimistico:** ipotizza incassi puntuali e conversione della pipeline commerciale secondo le probabilità dell'opportunità (collegamento diretto col Modulo CRM, sezione 5).

### 6.2 Ogni previsione è spiegabile nel dettaglio

Click su un punto della proiezione mostra i fattori che lo compongono: quali fatture attese, quali pagamenti programmati, quale stagionalità storica è stata applicata — stessa struttura di spiegabilità di tutta la piattaforma, qui con un livello di dettaglio finanziario specifico (elenco puntuale delle voci, non solo una descrizione testuale generica).

### 6.3 Collegamento con CRM e Inventory

Il cash flow previsto non è calcolato isolatamente: integra le probabilità di chiusura delle opportunità aperte in Pipeline (CRM) e gli impegni di acquisto programmati per il riordino scorte (Inventory, modulo successivo) — è il primo punto della Product Bible dove tre moduli diversi alimentano lo stesso calcolo in tempo reale, dimostrazione diretta del valore del Business Brain condiviso.

---

## 7. Costi e Margini

### 7.1 Struttura

Centri di costo configurabili (per reparto, progetto, linea di prodotto), con categorizzazione automatica proposta dall'AI per ogni nuova spesa registrata (basata su pattern di spese simili passate), sempre confermabile/correggibile manualmente.

### 7.2 Analisi per prodotto, cliente, progetto — la stessa domanda in tre contesti

*"Dove guadagniamo e dove perdiamo?"* applicata a tre dimensioni:
- **Per prodotto:** margine per singola linea, con segnalazione automatica se un prodotto scende sotto la soglia di redditività minima configurata.
- **Per cliente:** margine per cliente nel tempo (collegato al Relationship Score del CRM, sezione 4.2 — un cliente con margine in calo costante è un fattore che influenza anche quel punteggio).
- **Per progetto:** per aziende che lavorano a commessa, marginalità di ogni progetto con avanzamento costi vs budget preventivato.

### 7.3 Suggerimenti AI su costi e margini

Non generici ("riduci i costi") ma specifici e motivati: *"Il costo del fornitore Alfa per la materia prima Beta è aumentato del 12% negli ultimi due mesi, più della media di mercato per quella categoria — potrebbe valere la pena verificare alternative."* — sempre con i dati a supporto immediatamente ispezionabili.

---

## 8. Forecast

### 8.1 Cosa viene previsto

Fatturato, costi, utile, liquidità, fabbisogno finanziario futuro (utile in particolare per capire con anticipo se servirà una linea di credito) — tutti con lo stesso trattamento a tre scenari del Cash Flow (sezione 6.1), per coerenza di linguaggio in tutto il modulo.

### 8.2 Come costruisce ogni previsione il Business Brain

Combinazione di: serie storiche dell'azienda stessa (memoria strategica, Costituzione sezione 3), pipeline commerciale pesata per probabilità (CRM), stagionalità di settore quando rilevabile, impegni già noti (ordini confermati, contratti). **Mai un modello "scatola nera"**: la sezione "Come viene calcolato?" (già anticipata nel Modulo CRM per il forecast vendite) qui elenca esplicitamente ogni fattore e il suo peso relativo.

### 8.3 Affidabilità dichiarata esplicitamente

Un'azienda con 3 mesi di storico su AIOS riceve forecast con affidabilità dichiarata "Bassa" e un messaggio onesto ("Ancora poco storico per previsioni solide — l'accuratezza migliorerà con l'uso") invece di un numero apparentemente sicuro ma costruito su basi fragili — stesso principio di onestà già visto nel Modulo Home (Daily Brief) e CRM (forecast vendite), qui ribadito con ancora più rigore data la materia.

---

## 9. Finance Agent

### 9.1 Quando interviene

- Segnala anomalie di costo o di margine appena rilevate (non aspetta la chiusura mensile).
- Prepara il report finanziario periodico (sezione 10).
- Suggerisce risparmi specifici e concreti (sezione 7.3).
- Propone quando potrebbe essere il momento di valutare un investimento (es. "la liquidità prevista nei prossimi 6 mesi resta stabilmente sopra la soglia di sicurezza — potrebbe essere il momento di valutare l'acquisto di [attrezzatura/scorta] pianificato").
- Segnala rischi di liquidità con anticipo (non quando il problema è già arrivato).

### 9.2 Quando resta invisibile

Durante la normale consultazione dei dati (l'utente sta semplicemente leggendo un report senza aver chiesto analisi aggiuntiva) — stesso principio di non interruzione del Sales Agent (Modulo CRM, sezione 8.2).

### 9.3 Collaborazione con altri agenti

Con il Sales Agent per il margine sui preventivi (sezione 3.3), con l'Inventory Agent per il fabbisogno di cassa legato al riordino scorte (sezione 6.3), con l'Executive Agent (Costituzione, catalogo agenti) quando una domanda richiede una sintesi che attraversa più domini.

---

## 10. Automazioni finanziarie in linguaggio naturale

Stessa esperienza UX del Modulo Chat (sezione 10) e del Modulo CRM (sezione 9), qui con implicazioni di autonomia specifiche per la materia finanziaria:

| Richiesta | Livello di autonomia di default | Nota |
|---|---|---|
| *"Avvisami quando la liquidità prevista scende sotto €50.000"* | 1 — Suggerimento/notifica | Nessuna azione sui dati, solo allerta — livello minimo per definizione |
| *"Ogni primo del mese genera il report finanziario"* | 2 — Preparazione | Il report viene generato e reso disponibile, mai inviato automaticamente a destinatari esterni senza una prima conferma |
| *"Ricorda automaticamente i clienti con fatture scadute"* | 3 — Esecuzione previa approvazione (default), configurabile a 4 per importi piccoli | Un sollecito è comunicazione diretta al cliente — stesso principio del Modulo Chat (7.3) sui Tool a rischio medio-alto |
| *"Segnalami spese fuori dalla media"* | 1 — Suggerimento | Puramente analitico, nessuna azione |

Ogni automazione creata qui vive in AIOS Flow esattamente come quelle del CRM (Modulo Chat, sezione 10.2) — un solo motore di automazione condiviso in tutta la piattaforma, mai uno per modulo.

---

## 11. Ricerca Finanziaria

### 11.1 Esempi guida e come vengono risolti

*"Mostrami tutte le fatture superiori a €10.000 ancora non pagate"* → query strutturata diretta (filtro su importo e stato), risoluzione immediata senza bisogno di inferenza semantica complessa.

*"Quali clienti hanno generato il margine più alto quest'anno?"* → aggregazione che attraversa Finance (margine) e CRM (anagrafica cliente) — stesso principio di query cross-modulo già visto nel Cash Flow (6.3).

*"Quali costi sono aumentati rispetto allo scorso trimestre?"* → confronto temporale su categorie di costo, con il risultato che include sempre la both il dato assoluto e la variazione percentuale, mai solo uno dei due.

### 11.2 Precisione superiore alla semantica quando si tratta di importi

A differenza della ricerca CRM (dove l'ambiguità semantica è accettabile e anzi utile), qui il sistema **privilegia sempre l'interpretazione più letterale e verificabile** di un filtro numerico o temporale esplicito ("superiore a €10.000" significa esattamente quello, non "un importo abbastanza alto") — coerente col principio di accuratezza (sezione 1.2).

---

## 12. Analytics Finance

Dashboard dedicate a redditività, cash flow, margini, costi, previsioni, confronto periodi (mese su mese, anno su anno), **confronto budget vs consuntivo** (per le aziende che definiscono obiettivi economici, coerente col materiale di prodotto originario su Budget e Pianificazione) — ogni scostamento significativo evidenziato con la stessa disciplina cromatica del Design System (mai l'intero grafico colorato, solo lo scostamento rilevante). Ogni grafico spiegabile con lo stesso pattern "Perché?" di tutta la piattaforma.

---

## 13. Permessi (RBAC specifico di Finance)

| Ruolo | Visibilità | Modifica | Approvazione |
|---|---|---|---|
| CEO | Tutto | Tutto | Tutto |
| CFO | Tutto | Tutto | Tutto tranne ciò riservato al CEO da policy interna configurabile |
| Amministrazione | Fatture, pagamenti, scadenze | Emissione/registrazione documenti | Nessuna approvazione strategica |
| Commerciale | Solo il margine dei propri preventivi/clienti (non la situazione finanziaria aggregata dell'azienda) | Nessuna sui dati finanziari core | Nessuna |
| Responsabile di reparto | Solo i costi del proprio centro di costo | Nessuna sui dati contabili | Approvazione spese del proprio reparto entro soglia |
| Revisore | Tutto, sola lettura, con accesso completo all'audit log | Nessuna | Nessuna — ruolo di verifica, non operativo |
| Consulente esterno (es. commercialista) | Configurabile, tipicamente tutto in sola lettura per la propria area di competenza | Nessuna salvo esplicita concessione temporanea | Nessuna |

Questo RBAC è particolarmente rigido rispetto a quello del CRM (Modulo 4, sezione 13) perché qui l'errore o l'accesso improprio ha conseguenze fiscali e legali, non solo commerciali — coerente col principio di accuratezza come priorità del modulo (sezione 1.2).

---

## 14. Stati ed errori

| Situazione | Comportamento |
|---|---|
| Fattura incoerente (es. importi che non tornano) | Segnalata come anomalia bloccante per l'emissione definitiva (non per una bozza), mai emessa "nel dubbio" |
| Riconciliazione bancaria fallita | Il movimento resta in stato "da abbinare manualmente", mai forzato su una corrispondenza incerta |
| Dati mancanti per un calcolo (es. EBITDA, sezione 2.2) | Dichiarazione esplicita di cosa manca, mai un valore stimato presentato come solido |
| Previsione poco affidabile (storico insufficiente) | Dichiarato esplicitamente (sezione 8.3), mai nascosto dietro un numero apparentemente sicuro |
| Integrazione bancaria offline | Banner esplicito con data dell'ultimo aggiornamento riuscito ("Ultima sincronizzazione: 3 giorni fa") — mai un saldo mostrato come "attuale" quando in realtà non lo è |
| Dati finanziari in conflitto (es. due fonti diverse riportano saldi diversi per lo stesso conto) | Entrambe le fonti mostrate esplicitamente, mai una scelta silenziosa — stesso principio del Modulo CRM (14) qui applicato con ancora più rigore data la materia |

---

## 15. Scenari reali

### CEO controlla la liquidità
Apre Dashboard Finance → vede liquidità attuale e cash flow 30gg insieme (sezione 2.1) → nota un'anomalia segnalata in cima → chiede in Chat approfondimento → Finance Agent spiega la causa con link diretto al movimento specifico.

### CFO prepara il forecast trimestrale
Apre Forecast (sezione 8) → esamina i tre scenari → chiede "Come cambierebbe lo scenario realistico se il cliente Rossi non rinnovasse il contratto?" → simulazione basata su rimozione di quella componente specifica dalla pipeline pesata, con confronto diretto tra i due scenari.

### Amministrazione emette fatture
Da un ordine confermato in CRM, genera la fattura con un click → il sistema pre-compila tutto dai dati dell'ordine → conferma emissione → la fattura diventa immutabile (sezione 4.1) e alimenta automaticamente il cash flow previsto.

### Commerciale verifica il margine di un'offerta
Dentro il preventivo (CRM), guarda il margine in tempo reale (sezione 3.3) senza dover "passare" concettualmente in Finance — stesso dato, stesso modulo dati, presentato nel contesto in cui serve.

### Imprenditore da smartphone
Chiede a voce/testo: *"Quanto abbiamo in cassa?"* → risposta immediata e concisa, con eventuale anomalia urgente menzionata subito dopo se presente — coerente con l'ottimizzazione mobile "risposta breve, azionabile" già stabilita nel Modulo Chat (sezione 12, scenario Magazziniere).

---

## 16. Evoluzione futura

- **Modelli predittivi più sofisticati:** l'architettura a tre scenari (sezione 6.1, 8.1) resta la stessa interfaccia anche quando il motore predittivo sottostante evolve da pattern statistici semplici a modelli più avanzati — l'utente non percepisce discontinuità, solo previsioni via via più accurate.
- **Nuovi standard contabili:** la separazione tra dato oggettivo (mai generato dall'AI, sezione 1.2) e interpretazione (sempre dell'AI, sempre spiegata) rende il modulo adattabile a normative diverse per mercati futuri senza dover riprogettare la UX, solo la logica di calcolo sottostante.
- **Integrazioni bancarie evolute:** l'architettura a eventi (Step 1) tratta già ogni istituto bancario come una fonte di eventi tra le tante — aggiungerne di nuovi non richiede modifiche al modulo Finance stesso.
- **Plugin finanziari verticali:** un plugin specializzato (es. per un settore con esigenze fiscali specifiche) si aggiunge tramite l'architettura a manifest del Marketplace (Costituzione, sezione 8), senza toccare il core.
- **Simulazioni economiche avanzate:** il pattern "Come cambierebbe se...?" già visto nello scenario CFO sopra è la base naturale per un futuro Scenario Simulator più ricco (già anticipato nel materiale di prodotto originario) — l'architettura di questo modulo è già compatibile, non richiede un nuovo impianto.

---

## Conclusione

### Principi fondamentali stabiliti in questo modulo
1. L'accuratezza finanziaria è superiore alla fluidità conversazionale: nessun dato oggettivo è mai generato dall'AI, solo interpretato.
2. Ogni previsione è dichiarata come tale, sempre a tre scenari, mai un numero secco falsamente certo.
3. Una fattura emessa è immutabile per costruzione, coerente con la normativa fiscale.
4. Il RBAC finanziario è il più rigido di tutta la piattaforma, perché l'errore qui ha conseguenze legali, non solo operative.
5. Ogni conflitto tra fonti di dati finanziari è sempre mostrato esplicitamente, mai risolto silenziosamente.

### Decisioni architetturali prese
- Preventivo come oggetto unico condiviso tra CRM e Finance, non entità duplicate.
- Cash flow e Forecast condividono la stessa interfaccia a tre scenari, per coerenza di linguaggio.
- Riconciliazione bancaria automatica solo per corrispondenze univoche e certe, mai forzata.

### Decisioni rimandate
- Il dettaglio degli algoritmi predittivi specifici (materia di iterazione su dati reali, non di progettazione UX a priori — stessa scelta già presa nel Modulo CRM per lo scoring lead).
- L'integrazione con standard contabili di mercati specifici oltre l'Italia, da trattare in fase di espansione internazionale.

### Dipendenze con CRM, Home, Chat AI, Navigation, Business Brain e Analytics
- Riusa: struttura "Perché?", Suggested Actions, motore di automazione unico (AIOS Flow), Notification Center, RBAC generale (Step 1) esteso qui con regole specifiche.
- Introduce per la prima volta: il concetto di dato "immutabile per costruzione" (fattura emessa) — principio che si applicherà anche a futuri documenti fiscali in altri moduli.
- Dipende direttamente da CRM (pipeline per il forecast) e anticipa una dipendenza da Inventory (fabbisogno di cassa da riordino) che sarà formalizzata nel prossimo modulo.

### Impatto sul database
Entità core: Fattura (attiva/passiva, con stato e riferimento a nota di credito), Pagamento, Movimento bancario, Centro di costo, Categoria di spesa, Preventivo (condiviso con CRM), Scenario di forecast (con versioning per confronto storico delle previsioni fatte nel tempo — utile anche per misurare quanto il motore predittivo migliora).

### Impatto sulle API
Ogni azione del Finance Agent è un Tool dell'API pubblica (coerente con tutta la Product Bible); particolare attenzione a un endpoint di sola lettura per il ruolo Revisore, che deve poter accedere all'audit log completo senza alcuna possibilità di scrittura nemmeno accidentale a livello di permessi API, non solo di interfaccia.

### Impatto su frontend web, desktop, mobile
Il grafico a tre scenari (cash flow, forecast) richiede una libreria di visualizzazione dati coerente in tutte le piattaforme (Step 1) — su mobile, i tre scenari si alternano con uno swipe invece di essere mostrati simultaneamente affiancati, per non comprimere eccessivamente l'informazione su schermo piccolo.

### Linee guida per lo sviluppo
Costruire per primo il motore di calcolo margine in tempo reale (sezione 3.3) come servizio condiviso: sarà riusato identico in Inventory (margine su riordino) e in Analytics — evitare di implementarlo localmente dentro il solo modulo Preventivi.

---

## Prossimo modulo (in attesa di approvazione)

Con Finance approvato, procediamo con **Inventory** (Magazzino, Prodotti, Movimenti, Ordini, Fornitori, Acquisti, Riordino automatico).
