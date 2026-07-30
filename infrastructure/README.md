# Infrastructure

Infrastructure as Code, coerente con `docs/04-engineering-bible-04-infrastructure.md`.
**Cloud-agnostic per architettura** (Infrastructure, nota di metodo) — i moduli
Terraform qui dentro devono restare descrivibili per pattern, con
l'implementazione di riferimento (AWS, Step 1) isolata nei moduli specifici,
mai sparsa nel codice applicativo.

```
infrastructure/
├── terraform/
│   ├── modules/              Moduli riutilizzabili (rete, database, cluster...)
│   └── environments/         Un ambiente per directory: dev, staging, production
│                              (stessa struttura di moduli, valori diversi)
├── docker/                   Dockerfile per ogni servizio containerizzato
├── kubernetes/
│   ├── base/                 Manifest comuni a ogni ambiente
│   └── overlays/              Differenze per ambiente (kustomize)
└── scripts/                  Provisioning, manutenzione, disaster recovery drill
                               (Infrastructure, sezione 9.4 — test periodici di failover)
```

## Cosa NON scrivere qui

Nessuna configurazione specifica di business (soglie di autonomia AI, regole
RBAC) — quella vive nel database applicativo (Administration, Physical DB
Schema) o nel Model Registry (AI Platform). Questa cartella contiene solo
infrastruttura: reti, cluster, storage, non decisioni di prodotto.

## Stato di questa milestone

Solo struttura di cartelle — il contenuto Terraform/Kubernetes concreto è
successivo (non richiesto da questa prima milestone di fondamenta, che si
concentra su monorepo/stack/ambiente locale). Il debito da colmare prima
della prima messa in produzione reale è tracciato in
`docs/implementation-plan.md`.
