# AIOS — La Costituzione
## Documento Fondante: Business Brain, AI Agents, Memoria, Orchestrazione, Permessi, Workspace, UX, Marketplace

**Versione:** 1.0 — Bozza per approvazione
**Stato:** Integrazione allo Step 1, in attesa di approvazione prima dello Step 2 (modello dati)

---

## Perché questo documento si chiama "Costituzione"

Lo Step 1 ha definito *dove gira* AIOS (infrastruttura, linguaggi, database). Questo documento definisce *come pensa* AIOS. Ogni scelta qui dentro è più difficile da cambiare in futuro di uno stack tecnologico — perché non è un dettaglio implementativo, è il comportamento che milioni di utenti finiranno per dare per scontato. Per questo ogni componente è trattato come un "articolo": una regola che il resto del sistema deve rispettare, non un'opzione tra tante.

I nove componenti di questo documento non sono nove sistemi separati. Sono nove facce dello stesso organismo:

```
Evento aziendale
   → Business Brain (lo registra e lo collega)
      → Memoria multilivello (decide dove e per quanto vive)
         → Prompt Orchestrator (costruisce il contesto per l'AI)
            → AI Agents (ragionano e propongono un'azione)
               → Motore delle Autorizzazioni AI (decide se e come eseguirla)
                  → Workspace (l'azione accade nel contesto giusto, per l'utente giusto)
                     → UX globale (l'utente la vede, la capisce, la approva)
                        → Marketplace (nuovi agenti e capacità si aggiungono nel tempo)
```

---

## 1. Il Business Brain — architettura completa

Nello Step 1 il Business Brain era descritto come nucleo cognitivo condiviso. Qui lo progettiamo come sistema.

### 1.1 Le tre strutture dati del Business Brain

Il Business Brain non è "un database in più": è **tre strutture specializzate che rispondono a tre domande diverse**.

| Struttura | Domanda a cui risponde | Tecnologia |
|---|---|---|
| **Event Log** | *"Cosa è successo, e quando, esattamente?"* | Append-only, Kafka + Postgres (partizionato per tenant e per data) |
| **Knowledge Graph** | *"Come sono collegate le cose tra loro?"* | Modello a entità/relazioni su Postgres, con proiezioni verso un motore a grafo quando la profondità delle query lo richiede |
| **Memoria semantica** | *"Cosa significa, in un linguaggio che un modello AI può usare?"* | Vector store (pgvector → dedicato) |

Ogni evento aziendale attraversa tutte e tre: viene **registrato** (Event Log, immutabile, fonte di verità legale/di audit), **collegato** (Knowledge Graph, aggiorna le relazioni tra entità coinvolte), **vettorizzato** (Memoria semantica, reso interrogabile in linguaggio naturale). Questo triplo binario non è ridondanza: sono tre bisogni diversi che nessuna singola tecnologia soddisfa bene contemporaneamente.

### 1.2 Il ciclo di ingestione (come un evento entra nel Business Brain)

```
1. CATTURA     → un modulo (Mail, CRM, Finance...) pubblica un evento grezzo sull'Event Bus
2. NORMALIZZA  → un servizio di ingestione lo traduce in uno schema di evento comune
                 (chi, cosa, quando, entità coinvolte, modulo di origine)
3. COLLEGA     → il Knowledge Graph Writer crea/aggiorna nodi e relazioni
4. VETTORIZZA  → se l'evento contiene testo/contesto rilevante (email, nota, documento),
                 un embedding viene generato e salvato nella memoria semantica
5. NOTIFICA    → il Business Brain pubblica un evento derivato "conoscenza aggiornata",
                 che gli Agent possono ascoltare per reagire (es. un nuovo ordine
                 fa scattare il ricalcolo del forecast da parte del Finance Agent)
```

Il passaggio 2 (normalizzazione) è il punto più delicato: ogni modulo ha un formato dati proprio, ma il Business Brain deve ragionare su uno **schema di evento comune** (`tenant_id`, `entity_type`, `entity_id`, `action`, `actor`, `payload`, `timestamp`, `source_module`). Questo schema comune è il contratto più importante di tutta la piattaforma: ogni nuovo modulo, anche di terze parti dal Marketplace, deve pubblicare eventi in questo formato per entrare a far parte della conoscenza condivisa.

### 1.3 Company DNA — come si costruisce tecnicamente

Il "Company DNA" descritto nel materiale di prodotto (il modo in cui AIOS apprende lo stile di un'azienda specifica) non è un modello separato per cliente — sarebbe insostenibile addestrare un modello per ogni tenant. Tecnicamente è:

- Un **insieme di pattern osservati** (query aggregate sul Knowledge Graph: "negli ultimi 90 giorni, gli sconti approvati per clienti con score >80 sono stati in media del 7%")
- Iniettato come **contesto aggiuntivo** nel prompt quando un agente ragiona per quell'azienda specifica (vedi Prompt Orchestrator, sezione 4)
- **Mai** usato per fine-tuning di un modello per cliente: costo e complessità operativa insostenibili a migliaia di tenant. Il "apprendimento" è quindi a livello di dati recuperati, non di pesi del modello.

---

## 2. Architettura completa degli AI Agent

### 2.1 Cos'è un Agent, tecnicamente

Un AI Agent in AIOS **non è un prompt**. È un'unità con quattro componenti obbligatori:

```
AGENT = {
  Identità        → nome, dominio di competenza, versione
  Strumenti (Tools) → funzioni che l'agente può invocare (query al Brain, 
                       creazione di un documento, invio di un'email...)
  Memoria di lavoro → il contesto della sessione corrente (vedi sez. 3)
  Contratto di autonomia → cosa può fare da solo e cosa richiede approvazione
                            (vedi Motore delle Autorizzazioni, sez. 5)
}
```

Un agente **non ha accesso diretto al database**. Ogni azione passa attraverso Tools esplicitamente dichiarati e verificabili — questo è un principio di sicurezza non negoziabile: se un Tool non esiste per un'azione, l'agente non può eseguirla, per quanto un modello linguistico possa "credere" di poterlo fare.

### 2.2 Catalogo degli agenti core (v1)

| Agente | Dominio | Tools principali |
|---|---|---|
| Sales Agent | Pipeline, preventivi, follow-up | `query_crm`, `create_quote`, `schedule_followup` |
| Finance Agent | Cash flow, fatture, margini | `query_finance`, `generate_report`, `flag_anomaly` |
| Inventory Agent | Magazzino, riordini | `query_stock`, `create_purchase_order` |
| HR Agent | Turni, ferie, scadenze | `query_hr`, `notify_employee` |
| Executive Agent | Sintesi, KPI, raccomandazioni | `query_all_domains` (sola lettura, cross-modulo) |
| Compliance Agent | Verifica procedure | `audit_check`, `flag_missing_document` |

L'**Agent Orchestrator** (non un agente, ma il coordinatore) riceve ogni richiesta in linguaggio naturale, decide quali agenti coinvolgere, in quale ordine, e come combinare le risposte. Questo è distinto dal Prompt Orchestrator (sezione 4): l'Agent Orchestrator decide **chi** deve rispondere, il Prompt Orchestrator decide **con quale contesto** ciascuno risponde.

### 2.3 Ciclo di vita di una richiesta multi-agente

Esempio: *"Prepara un'offerta per Rossi Srl con il 10% di sconto e verifica che possiamo consegnare entro venerdì."*

```
1. Agent Orchestrator riceve la richiesta
2. Analizza l'intento → identifica due sotto-task: preventivo + verifica logistica
3. Instrada al Sales Agent (preventivo) e all'Inventory Agent (disponibilità), in parallelo
4. Ogni agente richiama i propri Tools, produce un risultato parziale
5. L'Orchestrator combina i risultati, verifica coerenza 
   (es. lo sconto proposto dal Sales Agent è compatibile con il margine minimo?)
6. Il risultato combinato passa al Motore delle Autorizzazioni (sez. 5)
7. Se approvato/autorizzato, l'azione finale viene eseguita e registrata nel Business Brain
```

**Gestione degli errori e fallback:** se un agente non è in grado di completare un task (Tool non disponibile, dati insufficienti), non deve mai "inventare" una risposta plausibile. Il contratto tecnico è: un agente restituisce sempre un risultato **oppure** un errore esplicito con motivazione, mai un'allucinazione silenziosa. Questo è verificato con un livello di validazione automatica sulle risposte prima che arrivino all'utente (structured output con schema verificato, non testo libero non controllato).

---

## 3. Il sistema di memoria multilivello

Quattro livelli, con criteri tecnici precisi su cosa entra in ciascuno e per quanto tempo:

| Livello | Contenuto | Storage | Durata / retention |
|---|---|---|---|
| **Memoria immediata** | Contesto della conversazione/sessione in corso | In-memory (Redis), legata alla sessione | Fino a fine sessione o timeout (es. 30 min di inattività) |
| **Memoria operativa** | Attività degli ultimi mesi (ordini recenti, email recenti) | Postgres, indicizzato per accesso rapido | Rolling window configurabile (default 90 giorni "caldi") |
| **Memoria storica** | Tutto lo storico oltre la finestra operativa | Postgres (partizioni fredde) + object storage per allegati | Illimitata, secondo le policy di retention del cliente |
| **Memoria strategica** | Pattern aggregati, non singoli eventi (il "Company DNA") | Viste materializzate su ClickHouse, ricalcolate periodicamente | Aggiornata, non "scade" — è un riassunto vivo |

### 3.1 Perché quattro livelli e non uno solo

Passare ogni singolo evento storico a un modello linguistico ad ogni richiesta sarebbe insostenibile in costo e in qualità (troppo contesto, troppo rumore). I quattro livelli permettono al **Prompt Orchestrator** (sezione 4) di scegliere quanta e quale memoria includere in base al tipo di domanda: una domanda operativa ("qual è lo stato dell'ordine di oggi?") pesca dalla memoria immediata e operativa; una domanda strategica ("il cliente Rossi sta comprando meno rispetto all'anno scorso?") pesca dalla memoria strategica, senza bisogno di rileggere ogni singola email del 2023.

### 3.2 Promozione e retrocessione tra livelli

Non tutto ciò che accade oggi resta "caldo" per sempre, e non tutto lo storico è ugualmente irrilevante. Un processo periodico (batch notturno):
- **Retrocede** dalla memoria operativa a quella storica gli eventi più vecchi della finestra configurata.
- **Ricalcola** la memoria strategica (pattern aggregati) includendo i nuovi dati del giorno.
- **Non retrocede mai** eventi legati a decisioni ancora "aperte" (es. una trattativa in corso resta in memoria operativa anche se più vecchia della finestra standard).

---

## 4. Il Prompt Orchestrator

Questo è il componente meno visibile e più critico: traduce "una domanda umana + i dati dell'azienda" in "un prompt che un modello linguistico può usare bene".

### 4.1 Le fasi di costruzione del prompt

```
1. Intent Classification   → che tipo di richiesta è? (domanda, comando, ambiguo)
2. Context Retrieval       → quali livelli di memoria servono? (sez. 3)
3. Knowledge Assembly      → interrogazione mirata al Business Brain
                             (non "tutto quello che sappiamo sul cliente X",
                             ma solo i campi rilevanti per QUESTA domanda)
4. Template Selection      → scelta del template di prompt per il tipo di task
                             (un template per "genera un preventivo" è diverso
                             da uno per "spiega perché il margine è calato")
5. Guardrail Injection     → regole di sicurezza e di tono aziendale iniettate
                             sempre, indipendentemente dal task
6. Model Routing           → quale modello usare (vedi 4.2)
7. Output Validation       → la risposta del modello viene verificata contro
                             uno schema atteso prima di proseguire
```

### 4.2 Model Routing — perché non un solo modello per tutto

Non ogni richiesta ha bisogno dello stesso modello. Una classificazione semplice ("questa email è un reclamo o una richiesta commerciale?") non richiede lo stesso modello di un ragionamento complesso multi-step. Il Prompt Orchestrator instrada verso:
- **Modello leggero/economico** per classificazione, estrazione dati, task ad alto volume
- **Modello di ragionamento avanzato** per generazione di proposte, spiegazioni, task multi-agente

Questo instradamento è **configurabile e disaccoppiato dal codice applicativo** (layer model-agnostic già citato nello Step 1): cambiare il modello dietro una categoria di task non richiede toccare la logica di business.

### 4.3 Versionamento dei prompt

I template di prompt sono trattati **come codice**: versionati, testati, con changelog. Una modifica a un template passa da un ambiente di test dove si verifica che le risposte su un set di casi campione non peggiorino, prima di essere rilasciata in produzione. Questo evita il problema comune di "abbiamo cambiato un prompt e ora l'AI si comporta in modo imprevedibile" senza tracciabilità.

---

## 5. Il motore delle autorizzazioni AI

Distinto e complementare al sistema di permessi umani (RBAC) descritto nello Step 1. Qui il soggetto che richiede il permesso è un agente, non una persona.

### 5.1 I cinque livelli di autonomia (già anticipati nel materiale di prodotto, ora formalizzati)

| Livello | Nome | Comportamento tecnico |
|---|---|---|
| 0 | Solo analisi | L'agente può leggere ed elaborare, non può proporre azioni scrivibili |
| 1 | Suggerimento | L'agente propone un'azione, mostrata all'utente, nessuna esecuzione automatica |
| 2 | Preparazione | L'agente prepara l'azione (es. bozza email, bozza preventivo) pronta per revisione umana |
| 3 | Esecuzione previa approvazione | L'agente esegue solo dopo un click esplicito di conferma da parte di un umano autorizzato |
| 4 | Automazione completa | L'agente esegue senza intervento umano, entro regole e soglie predefinite |

### 5.2 La matrice dei permessi

Il livello di autonomia **non è globale**: è definito per combinazione di `(tenant, agente, tipo di azione, soglia)`. Esempio concreto: il Sales Agent può avere livello 4 per "creare un preventivo sotto i 5.000€" ma livello 3 obbligatorio per "creare un preventivo sopra i 50.000€" — esattamente come già previsto nel materiale di prodotto per l'approvazione dei preventivi oltre soglia.

Questa matrice è **configurabile dal cliente** (nell'interfaccia amministrativa) ma ha **default prudenti di fabbrica**: nessuna azienda parte con automazione completa attivata su azioni finanziariamente rilevanti; l'autonomia si "sblocca" progressivamente, in linea con la filosofia di fiducia costruita nel tempo già presente nel materiale di prodotto.

### 5.3 Perché questo motore è separato dal RBAC umano

Un utente umano con permesso di "creare preventivi" non delega automaticamente lo stesso permesso incondizionato a un agente AI che agisce per suo conto. Il permesso umano stabilisce **il perimetro massimo possibile**; il motore di autorizzazioni AI stabilisce **quanto di quel perimetro l'agente può esercitare senza supervisione**. Sono due dimensioni distinte e il sistema deve poter esprimere: "questo utente potrebbe approvare preventivi fino a 100.000€, ma ha scelto di far agire l'AI in autonomia solo fino a 5.000€".

### 5.4 Tracciabilità obbligatoria

Ogni azione eseguita da un agente, a qualunque livello di autonomia, genera un record immutabile: quale agente, quali dati ha usato, quale regola della matrice ha applicato, se è stata approvata da un umano e da chi. Questo record alimenta sia l'audit di sicurezza sia — elemento distintivo di AIOS — la spiegabilità mostrata all'utente ("perché l'AI ha suggerito questo?").

---

## 6. Il sistema di Workspace

### 6.1 Cos'è un Workspace, tecnicamente

Un Workspace è il **contesto attivo** in cui un utente sta operando in un dato momento: quale azienda (tenant), quale ruolo, quali moduli sono visibili, quale stato di conversazione con l'AI è aperto. Non è un concetto puramente di interfaccia: è un oggetto di sessione con un proprio ciclo di vita.

```
Workspace = {
  utente attivo,
  tenant attivo (azienda selezionata),
  ruolo effettivo in quel tenant,
  moduli abilitati (in base al piano dell'azienda),
  stato della sessione AI corrente (memoria immediata, sez. 3),
  preferenze di interfaccia (layout, dashboard personalizzata)
}
```

### 6.2 Multi-workspace per utente

Una persona può operare per più aziende clienti di AIOS (es. un commercialista che segue più PMI, o un utente con ruoli diversi in una holding e nelle controllate). Il sistema supporta il **cambio di workspace** senza logout: cambiare tenant attivo aggiorna in modo atomico ruolo, moduli visibili e contesto AI, e — punto di sicurezza critico — invalida immediatamente qualsiasi riferimento in cache al workspace precedente, per evitare che un dato dell'azienda A resti visibile per errore mentre si opera nell'azienda B.

### 6.3 Isolamento del Workspace rispetto al multi-tenancy di sistema

Il multi-tenancy (Step 1) garantisce che i *dati* di due aziende non si mescolino mai a livello di database. Il Workspace garantisce che l'*esperienza* dell'utente non si mescoli mai a livello di interfaccia e di sessione AI — sono due garanzie complementari, non la stessa cosa: un bug che mescolasse solo i workspace lasciando intatto l'isolamento dati sarebbe comunque un incidente di sicurezza percepita gravissimo (l'utente vedrebbe, anche solo per un istante, l'interfaccia "sporcarsi" con elementi non suoi).

---

## 7. La UX globale della piattaforma

### 7.1 Il principio guida: il linguaggio naturale come interfaccia primaria, non come feature aggiuntiva

Questo ha un'implicazione architetturale precisa: **ogni funzionalità deve esistere prima come azione richiamabile dalla chat, e solo poi (o in parallelo) come pulsante in un'interfaccia grafica** — mai il contrario. Se una funzione esiste solo come bottone e non come Tool invocabile da un agente, quella funzione è "invisibile" per l'AI e rompe la promessa centrale del prodotto.

### 7.2 Coerenza cross-modulo

Design system unico (token di colore, spaziatura, tipografia, componenti) condiviso da web e desktop (stessa codebase incapsulata da Tauri) e adattato, non reinventato, su mobile. Ogni modulo (CRM, Finance, Inventory...) usa gli stessi pattern di interazione per le stesse azioni ricorrenti (creare, modificare, approvare, esportare) — un utente che impara a usare un modulo deve già sapere usare gli altri.

### 7.3 Le "risposte attive" come pattern di interfaccia universale

Ogni risposta dell'AI, in qualunque punto della piattaforma, segue lo stesso contratto di interfaccia: contenuto (testo/grafico/tabella) + azioni proposte concrete, mai una risposta "morta" che l'utente deve poi tradurre manualmente in un'azione altrove. Questo pattern è definito una volta nel design system e riutilizzato ovunque, non reinventato modulo per modulo.

### 7.4 Navigazione: ricerca universale come punto di ingresso equivalente al menu

La UX globale tratta la barra di ricerca universale (già descritta nel materiale di prodotto) come un **secondo sistema di navigazione di pari livello** rispetto al menu strutturato — non un'aggiunta minore. Tecnicamente, questo significa che la ricerca universale interroga in parallelo Knowledge Graph, memoria semantica ed entità strutturate, non un semplice `LIKE '%testo%'` su poche tabelle.

---

## 8. Il Marketplace dei Plugin

### 8.1 Cosa può essere un plugin

Tre categorie, con livelli di accesso e fiducia crescenti:

| Categoria | Esempio | Accesso al sistema |
|---|---|---|
| **Workflow** | Automazione predefinita (es. "gestione reclami") | Solo Tools già esposti da AIOS, nessun codice arbitrario |
| **Integrazione** | Connettore verso un software verticale | API in uscita/entrata autenticata, sandbox di rete |
| **Agente custom** | Un nuovo AI Agent specializzato per un settore | Esecuzione in ambiente isolato, Tools dichiarati esplicitamente e approvati in fase di certificazione |

### 8.2 Sandboxing — il principio di sicurezza del Marketplace

Nessun plugin di terze parti esegue codice nel processo principale di AIOS. Ogni plugin di categoria "Agente custom" o "Integrazione" gira in un **ambiente isolato** (container dedicato o runtime sandboxato), comunica con il core esclusivamente attraverso l'API pubblica versionata (Step 1, sezione 22), e dichiara in anticipo un manifest esplicito di:
- quali Tools richiede
- quali dati del tenant richiede in lettura/scrittura
- quale livello di autonomia massimo può richiedere (mai superiore a quanto il cliente concede esplicitamente)

### 8.3 Processo di certificazione

Prima di essere pubblicato, ogni plugin passa da:
1. Validazione automatica del manifest (nessuna richiesta di permesso non dichiarata)
2. Test in ambiente sandbox con dati sintetici
3. Revisione umana per i plugin di categoria "Agente custom" (rischio più alto)
4. Versionamento pubblico, con possibilità per AIOS di sospendere una versione che si dimostri problematica senza rimuovere l'intero plugin

### 8.4 Modello economico tecnico

Ogni transazione generata tramite un plugin (abbonamento aggiuntivo, uso a consumo) passa attraverso il **billing engine centrale di AIOS**, mai gestita direttamente dallo sviluppatore terzo verso il cliente finale — questo garantisce un'unica fattura per il cliente, tracciabilità completa, e la commissione di piattaforma applicata in modo automatico e trasparente.

---

## 9. Come tutti i componenti collaborano — un flusso end-to-end completo

Per verificare che l'architettura regga nella pratica, ripercorriamo un caso reale attraverso tutti e nove i componenti:

> *Un'email arriva da Rossi Srl chiedendo un preventivo con sconto.*

```
1. Business Brain (Ingestione)
   → l'email viene normalizzata, collegata al cliente nel Knowledge Graph,
     vettorizzata nella memoria semantica

2. Memoria multilivello
   → viene recuperato il contesto: storico ordini (memoria operativa),
     pattern di sconto concessi in passato a clienti simili (memoria strategica)

3. Prompt Orchestrator
   → costruisce il prompt per il task "genera preventivo", instradando
     al modello di ragionamento avanzato (non al modello leggero)

4. AI Agents
   → l'Agent Orchestrator coinvolge Sales Agent (preventivo) e Inventory Agent 
     (disponibilità); Sales Agent nota che lo sconto richiesto supera la soglia
     "automatica" per questo cliente

5. Motore delle Autorizzazioni AI
   → la matrice indica: sconto oltre soglia → livello 3, richiede approvazione umana
   → viene generata una proposta, non un'azione eseguita

6. Workspace
   → la proposta appare nel Workspace del commerciale responsabile di quel cliente,
     non in quello di altri utenti dell'azienda

7. UX globale
   → la proposta si presenta come "risposta attiva": testo + pulsante "Approva e invia"
     + spiegazione del perché lo sconto richiede approvazione

8. (Se in futuro un plugin Marketplace gestisse un canale di vendita specifico,
   es. un connettore e-commerce verticale) 
   → riceverebbe l'evento "preventivo approvato" attraverso la stessa API pubblica
     usata da qualunque altro modulo, nessun trattamento privilegiato
```

Questo singolo esempio dimostra il criterio con cui giudicare ogni futura decisione tecnica su questi nove componenti: **se un nuovo modulo, agente o plugin non riesce a inserirsi in questo stesso flusso senza eccezioni speciali nel codice, l'architettura ha un problema da correggere prima, non un'eccezione da giustificare dopo.**

---

## In sintesi — i nove articoli di questa Costituzione

1. Il Business Brain è l'unica fonte di conoscenza condivisa: nessun modulo, nemmeno di terze parti, ha una "sua" verità parallela.
2. Ogni AI Agent agisce solo attraverso Tools dichiarati, mai con accesso diretto ai dati.
3. La memoria è multilivello per costruzione, non un unico contenitore che cresce all'infinito.
4. Ogni prompt è costruito, versionato e testato come codice — mai scritto "a mano" in produzione.
5. L'autonomia di un agente è sempre configurabile per soglia, mai un interruttore unico globale.
6. Il Workspace isola l'esperienza utente con la stessa serietà con cui il multi-tenancy isola i dati.
7. Il linguaggio naturale è il punto di ingresso primario di ogni funzionalità, l'interfaccia grafica ne è la proiezione.
8. Nessun plugin di terze parti esegue codice non sandboxato né bypassa il motore di autorizzazioni.
9. Ogni componente deve poter attraversare lo stesso flusso end-to-end senza eccezioni speciali.

---

## Prossimo step (in attesa di approvazione)

Con questo documento approvato, procediamo — come concordato — alla progettazione dettagliata del **modello dati completo** (schema Postgres: entità, tabelle, relazioni, indici, strategia di partizionamento per il Business Brain).
