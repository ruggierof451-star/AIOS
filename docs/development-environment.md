# AIOS — Ambiente di Sviluppo

## Requisiti software

- **Node.js** ≥ 20.x
- **pnpm** ≥ 9.x (package manager scelto per il monorepo — gestione efficiente
  dei workspace e delle dipendenze condivise tra i molti package)
- **Docker** e **Docker Compose** (per i servizi infrastrutturali locali)
- **Rust** (solo per chi lavora su `apps/desktop` — richiesto da Tauri)
- Per iOS: **Xcode** (macOS); per Android: **Android Studio**

## Configurazione locale — passo per passo

Vedi anche il README principale per i comandi rapidi. Dettaglio per chi
imposta l'ambiente per la prima volta:

1. **Clona il repository e installa le dipendenze**
   ```bash
   pnpm install
   ```
   Questo installa le dipendenze di *ogni* workspace (apps, backend/services,
   ai-platform, packages) in un'unica operazione, sfruttando i link simbolici
   di pnpm tra package interdipendenti (es. `backend/services/crm` che dipende
   da `packages/domain-model`).

2. **Variabili d'ambiente**
   ```bash
   cp .env.example .env
   ```
   Compila almeno `MODEL_PROVIDER_PRIMARY_API_KEY` se vuoi testare in locale
   funzionalità che coinvolgono l'AI Platform — senza questa chiave, i servizi
   di dominio (CRM, Finance...) funzionano comunque, solo le funzionalità AI
   restano non testabili end-to-end.

3. **Servizi infrastrutturali**
   ```bash
   docker compose up -d
   ```
   Avvia Postgres (con estensione pgvector), Redis, Redpanda (Kafka-compatibile),
   MinIO (Object Storage) e ClickHouse. Verifica che tutti i container siano
   "healthy" prima di procedere:
   ```bash
   docker compose ps
   ```

4. **Migrazioni database**
   ```bash
   pnpm db:migrate
   ```
   Applica lo schema fisico (Engineering Bible, Modulo 6) al database Postgres
   locale.

5. **Dati di esempio (opzionale ma consigliato)**
   ```bash
   pnpm db:seed
   ```
   Popola il database con un'Organization di esempio, alcuni Party/Customer,
   utenti di test per ciascun ruolo principale (utile per verificare RBAC
   durante lo sviluppo).

6. **Avvio di tutti i servizi**
   ```bash
   pnpm dev
   ```
   Turborepo avvia in parallelo ogni servizio backend, l'AI Platform e
   l'applicazione web, con hot-reload attivo.

## Gestione degli ambienti (richiamo a Infrastructure Modulo 4, sezione 13)

| Ambiente | Dove | Dati |
|---|---|---|
| **Locale** | Docker Compose su questa macchina | Sintetici, generati da `db:seed` |
| **Sviluppo condiviso** | Cloud, per feature branch | Sintetici, isolati per sviluppatore/feature (Preview Environment) |
| **Staging** | Cloud, identico a produzione per configurazione | Copia anonimizzata o sintetica a volume realistico |
| **Produzione** | Cloud | Dati reali dei clienti |

## Gestione dei segreti in locale vs produzione

In locale, i segreti vivono nel file `.env` (mai committato, vedi `.gitignore`).
In produzione, **nessun segreto è mai in una variabile d'ambiente in chiaro** —
tutti passano dal vault dedicato descritto in Infrastructure Modulo 4, sezione 12.1.
Questa differenza è intenzionale e documentata per evitare che uno sviluppatore
riporti per abitudine un pattern da sviluppo locale in un ambiente reale.

## Container di sviluppo (Dev Container, opzionale)

Per chi preferisce non installare Node/pnpm/Rust localmente, è prevista
(da completare in una milestone successiva) una configurazione Dev Container
(`​.devcontainer/`) che fornisce un ambiente preconfigurato identico per
tutto il team — utile soprattutto per chi si unisce al progetto e vuole
essere operativo in pochi minuti senza divergenze di versione tra macchine.

## Problemi comuni

- **Porta già in uso (5432, 6379, 9092...):** un altro servizio locale sta
  probabilmente usando la stessa porta — verifica con `lsof -i :<porta>` e
  interrompi il processo in conflitto, oppure modifica le porte esposte in
  `docker-compose.yml` (e aggiorna `.env` di conseguenza).
- **Migrazioni che falliscono su un database non vuoto:** in locale è sempre
  sicuro azzerare il volume Docker (`docker compose down -v`) e ripartire da
  zero — mai farlo su Staging o Produzione.
