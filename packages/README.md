# Packages

Librerie condivise tra più applicazioni/servizi. Regola generale: se un pezzo
di codice serve a più di un workspace, vive qui — mai duplicato copia-incolla
tra `apps/`, `backend/services/*` e `ai-platform/*`.

| Package | Contenuto | Consumato da |
|---|---|---|
| `domain-model` | Tipi TypeScript delle entità, Value Object, Aggregate Root (Domain Model, Modulo 1) — generati/allineati allo schema Prisma | Tutti i servizi backend, AI Platform |
| `api-contract` | Envelope di risposta, Error Model, tipi di richiesta/risposta condivisi (API Contract, Modulo 2, sez. 1, 6) | Tutti i servizi backend, tutti i client |
| `event-schemas` | Schema/tipi di ogni Domain Event del catalogo (API Contract, Modulo 2, sez. 5) | Tutti i servizi (produttori e consumatori di eventi) |
| `design-system` | Token di colore, tipografia, spaziatura (Product Bible, Modulo 0) — nessun componente visuale, solo i valori | `ui-components`, `apps/web`, `apps/desktop` |
| `ui-components` | Componenti React condivisi (Bottoni, Card, il pattern "Perché?", Suggested Actions...) | `apps/web`, `apps/desktop` |
| `config` | Configurazioni condivise: ESLint, Prettier, tsconfig di base per categoria di package | Ogni workspace del monorepo |
| `utils` | Utility generiche senza alcuna dipendenza di dominio (formattazione date, funzioni pure) | Ovunque serva, senza restrizioni essendo privo di logica di business |

## Perché `ui-components` non include `apps/mobile`

React Native non condivide gli stessi componenti DOM di React web — i
componenti mobile vivono dentro `apps/mobile` stesso, ma **consumano gli
stessi token** da `design-system` per restare visivamente coerenti (Product
Bible, Design System, sezione 8, responsive/mobile).

## Perché `domain-model` non contiene logica, solo tipi

La logica di business (le regole, gli invarianti) vive nei singoli servizi
backend, non qui — `domain-model` è deliberatamente "anemico" (solo forma dei
dati) per evitare che diventi un punto di accoppiamento nascosto tra
Bounded Context che dovrebbero restare indipendenti (Domain Model, principio
1, "Bounded Context per dominio di business reale").
