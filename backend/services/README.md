# Backend Services

Un servizio NestJS per ogni Bounded Context definito nel Domain Model
(`docs/04-engineering-bible-01-domain-model.md`, sezione 2). Ogni servizio:

- possiede il proprio schema Postgres dedicato (Physical Database Schema, sez. 1.1)
- espone API REST coerenti con l'API Contract (Modulo 2)
- pubblica/consuma esclusivamente Domain Event tramite `backend/services/eventing`
- **non importa mai** codice o accede mai al database di un altro servizio
  direttamente — solo tramite chiamata API o evento

## Struttura interna di ogni servizio (convenzione da rispettare in ogni cartella)

```
<service>/
├── src/
│   ├── domain/          Entità, Value Object, Aggregate Root (specchio del
│                         Domain Model per questo contesto)
│   ├── application/      Casi d'uso / servizi applicativi
│   ├── infrastructure/    Repository Postgres, client di altri servizi
│   ├── api/               Controller REST (coerenti con API Contract)
│   └── events/            Publisher/Subscriber di Domain Event
├── test/
│   ├── unit/
│   ├── integration/
│   └── contract/          Verifica contro lo schema dichiarato nell'API Contract
└── README.md              Specifico del servizio: quali entità, quali eventi
```

## Elenco dei servizi e riferimento alla documentazione

| Servizio | Documento di riferimento primario |
|---|---|
| identity | Domain Model, sez. 2.1 |
| organization | Domain Model, sez. 2.3 |
| workspace | Domain Model, sez. 2.2; Costituzione, sez. 6 |
| crm | Product Bible Modulo 4; Domain Model, sez. 2.5 |
| finance | Product Bible Modulo 5; Domain Model, sez. 2.6 |
| inventory | Product Bible Modulo 6; Domain Model, sez. 2.7 |
| hr | Domain Model, sez. 2.8 (Product Bible HR non ancora progettata) |
| documents | Domain Model, sez. 2.9 |
| calendar | Domain Model, sez. 2.10 |
| analytics | Domain Model, sez. 2.11 — **sola lettura per costruzione** |
| automation | Domain Model, sez. 2.13 (AIOS Flow) |
| notification | Domain Model, sez. 2.14 |
| marketplace | Domain Model, sez. 2.15; Costituzione, sez. 8 |
| administration | Domain Model, sez. 2.16 — RBAC, audit, billing |
| eventing | Infrastructure Modulo 4, sez. 6; Physical DB Schema, sez. 5 |

Ogni cartella contiene per ora solo questo README — il codice viene introdotto
milestone per milestone, a partire da Milestone 1 (identity, organization,
workspace, administration), coerente con `docs/implementation-plan.md`.
