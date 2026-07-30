# AIOS — Piano di Implementazione

Suddivisione dell'intero sviluppo in milestone incrementali e testabili. Ogni
milestone produce software funzionante e verificabile, mai solo teoria — coerente
con la modalità di lavoro stabilita per questa fase.

L'ordine segue le dipendenze già identificate nell'Engineering Bible (in particolare
Physical Database Schema, sezione 14 "Linee guida implementative") e nel Runtime
(sezione 16, evoluzione) — non è un ordine arbitrario, ricalca dove possibile le
priorità già motivate nei documenti approvati.

---

## Milestone 0 — Fondamenta (questa milestone)

**Obiettivo:** struttura di progetto, stack, ambiente locale pronti.
**Dipendenze:** nessuna.
**Deliverable:** questo monorepo, con struttura completa, configurazione locale
funzionante, documentazione portata dentro il repository.
**Criteri di completamento:** un nuovo sviluppatore può clonare il repository,
seguire `docs/development-environment.md` e avere l'ambiente locale funzionante
in meno di 30 minuti.
**Rischi:** nessuno significativo — è puro setup, senza logica di business.

---

## Milestone 1 — Identity, Organization, Workspace, Administration

**Obiettivo:** le fondamenta senza cui nessun altro contesto può funzionare —
autenticazione, multi-tenancy, RBAC, audit log.
**Dipendenze:** Milestone 0.
**Deliverable:**
- Servizio Identity funzionante (registrazione, login, MFA, refresh token)
- Servizio Organization (creazione azienda, gerarchia Branch/Department)
- Servizio Workspace (switch tra aziende)
- Servizio Administration (RBAC completo, audit_log automatico)
- Schema fisico Postgres di questi quattro contesti, con RLS attiva e verificata
- Test contract per ogni endpoint di questi servizi
**Criteri di completamento:** un utente può registrarsi, creare un'azienda,
invitare un secondo utente con un ruolo specifico, e il secondo utente vede
esattamente i permessi assegnati — verificato con test automatici, non solo
manualmente.
**Rischi:** è la milestone da cui tutto dipende — un errore nel modello RBAC o
nell'isolamento multi-tenant si propagherebbe silenziosamente a ogni milestone
successiva. Priorità assoluta a coverage di test qui, anche a costo di
rallentare questa fase rispetto alle successive.

---

## Milestone 2 — Eventing Backbone

**Obiettivo:** Transactional Outbox, Event Bus, Saga State, Retry/DLQ
funzionanti e testati, prima che qualunque Bounded Context applicativo li usi.
**Dipendenze:** Milestone 1 (serve `organization_id` per partizionare gli eventi).
**Deliverable:**
- Servizio Eventing (relay Outbox → Kafka/Redpanda)
- Schema `eventing.*` completo (Physical Database Schema, sezione 5)
- Un evento di prova end-to-end (pubblicazione, consumo, deduplicazione,
  gestione di un fallimento simulato con DLQ)
**Criteri di completamento:** un evento pubblicato da un servizio di prova
raggiunge un consumatore di prova con garanzia di non-duplicazione anche
simulando un crash del consumatore a metà elaborazione.
**Rischi:** il pattern Transactional Outbox è delicato (Physical Database
Schema, sezione 14) — un errore qui comprometterebbe la garanzia di
consistenza di tutta la piattaforma. Test di carico e di scenario di guasto
obbligatori prima di considerare questa milestone chiusa, non solo il
percorso felice.

---

## Milestone 3 — CRM (primo Bounded Context applicativo completo)

**Obiettivo:** il primo modulo di business reale, end-to-end: dal database
all'interfaccia web.
**Dipendenze:** Milestone 1, 2.
**Deliverable:**
- Schema `crm.*` (Party, Customer, Opportunity, Quote)
- API REST completa per CRM (coerente con API Contract, Modulo 2, sezione 3.1)
- Interfaccia web: Dashboard CRM, Scheda Cliente, Pipeline (Product Bible,
  Modulo 4) — **senza** ancora le funzionalità AI (rimandate a Milestone 6)
- Pattern di deduplicazione Party con conferma esplicita, funzionante
**Criteri di completamento:** un utente può creare un cliente, creare
un'opportunità, generare un preventivo (senza ancora l'assistenza del Sales
Agent), vederlo nella Pipeline Kanban.
**Rischi:** è il primo caso reale del pattern anagrafica condivisa (Party) —
stabilisce il precedente che Finance e Inventory seguiranno; un errore di
design qui si ripeterebbe negli altri due contesti se non corretto per tempo.

---

## Milestone 4 — Finance

**Obiettivo:** secondo pilastro applicativo, con l'aggregato Quote condiviso
con CRM già funzionante.
**Dipendenze:** Milestone 3 (Quote condiviso).
**Deliverable:**
- Schema `finance.*` (Invoice con trigger di immutabilità, Payment, CreditNote)
- API Finance completa
- Interfaccia web: Dashboard Finance, gestione Fatture, Cash Flow (senza
  ancora il forecast a tre scenari basato su AI — solo dati storici)
**Criteri di completamento:** un'Opportunity vinta in CRM genera un Order che
genera un'Invoice; un tentativo di modificare un'Invoice Emessa fallisce
correttamente (test esplicito sull'invariante).
**Rischi:** il trigger di immutabilità è irreversibile una volta in produzione
con dati reali — testare a fondo in questa milestone, mai "sistemarlo dopo".

---

## Milestone 5 — Inventory

**Obiettivo:** terzo pilastro applicativo, con la prima vera Saga multi-contesto
(Order → Stock → verifica liquidità Finance).
**Dipendenze:** Milestone 3, 4.
**Deliverable:**
- Schema `inventory.*` (Product, Stock con vincolo di non-negatività, Supplier)
- API Inventory completa
- Prima implementazione reale del pattern Saga (Runtime Modulo 5, sezione 8)
  per il flusso Order-Confirmed → Stock-Reserved → Invoice-Issued
- Interfaccia web: Catalogo Prodotti, Movimenti, Dashboard Inventory
**Criteri di completamento:** uno scenario di fallimento simulato (es. la
generazione della fattura fallisce dopo che lo stock è già stato riservato)
attiva correttamente la compensazione Saga, verificato con un test end-to-end
dedicato (Runtime, scenario 15.6).
**Rischi:** primo vero banco di prova del pattern Saga in produzione di codice
reale, non solo in un test di prova come nella Milestone 2 — riservare tempo
esplicito per iterare se il primo tentativo rivela lacune nel design della
Saga stessa.

---

## Milestone 6 — AI Platform, primo agente end-to-end (Sales Agent)

**Obiettivo:** la prima dimostrazione reale del sistema cognitivo funzionante
su dati applicativi veri, non più solo teoria architetturale.
**Dipendenze:** Milestone 3, 4, 5 (il Sales Agent tocca tutti e tre i contesti).
**Deliverable:**
- Prompt Orchestrator, Context Engine, Model Router funzionanti (versione
  minima, non ogni raffinatezza del Modulo 3, ma il meccanismo completo)
- Knowledge Graph e Vector Platform in prima versione
- Tool Execution Engine con almeno i Tool del Sales Agent (`create_quote`,
  `query_crm`)
- Motore di autorizzazioni AI (livelli di autonomia) funzionante
- Chat AI (interfaccia minima ma completa nel meccanismo, Product Bible
  Modulo 2) capace di gestire lo scenario "prepara un preventivo per..."
**Criteri di completamento:** lo scenario "Commerciale prepara un'offerta"
(Product Bible CRM, sezione 15) funziona end-to-end, dalla richiesta in
linguaggio naturale alla proposta con spiegazione "Perché?", fino
all'esecuzione previa conferma.
**Rischi:** è la milestone di più alto rischio tecnico dell'intero piano —
il primo momento in cui AI Platform, Domain Model e Runtime devono
funzionare insieme davvero, non solo sulla carta. Prevedere margine di
tempo significativamente superiore alle stime iniziali.

---

## Milestone 7 — Home, Navigation, Notification (l'esperienza unificata)

**Obiettivo:** portare i tre moduli applicativi e il primo agente dentro
un'unica esperienza coerente, invece di tre app scollegate.
**Dipendenze:** Milestone 3, 4, 5, 6.
**Deliverable:** Home Dashboard reale (Product Bible Modulo 1), Sidebar/Topbar/
Command Palette (Modulo 3), Notification Center collegato agli eventi reali
già fluenti dai tre contesti applicativi.
**Criteri di completamento:** un utente vive un'unica sessione coerente
attraverso CRM, Finance, Inventory e Chat, senza percepire discontinuità.
**Rischi:** principalmente di design/coerenza più che tecnici — richiede
disciplina nel non introdurre eccezioni ad-hoc per far "quadrare" l'interfaccia.

---

## Milestone 8 — Applicazioni Desktop e Mobile

**Obiettivo:** estendere l'esperienza web (Milestone 7) alle altre due
superfici client.
**Dipendenze:** Milestone 7.
**Deliverable:** `apps/desktop` (Tauri) e `apps/mobile` (React Native) con le
stesse funzionalità core della web, adattate ai rispettivi pattern di
interazione (Product Bible, Navigazione Mobile sezione 8).
**Criteri di completamento:** i tre scenari mobile già descritti nella Product
Bible (magazziniere, imprenditore in mobilità) funzionano davvero sul
dispositivo, non solo in teoria.
**Rischi:** la modalità di scansione codice a barre (fotocamera) e le
notifiche push richiedono testing su dispositivi reali, non solo simulatori.

---

## Milestone successive (accennate, da dettagliare quando ci si avvicina)

HR, Documents, Calendar, Analytics, Automation (AIOS Flow), Marketplace —
seguiranno lo stesso pattern (schema → API → interfaccia → eventuale
componente AI dedicato), con priorità e dipendenze da confermare in base
a cosa emerge dalle milestone precedenti, coerente con l'approccio
incrementale richiesto.

---

## Nota conclusiva su questo piano

Ogni milestone da 3 in poi segue lo stesso pattern (schema fisico → API →
interfaccia → eventuale AI), non perché sia l'unico ordine possibile, ma
perché replica una sequenza già validata concettualmente nell'Engineering
Bible — se durante lo sviluppo emergesse un motivo concreto per invertire
l'ordine di due milestone, è una decisione da segnalare esplicitamente e
motivare, non da fare silenziosamente.
