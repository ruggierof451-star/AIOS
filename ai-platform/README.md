# AI Platform

I dieci componenti cognitivi definiti in
`docs/04-engineering-bible-03-ai-platform.md` (AI Platform Architecture),
più gli agenti nativi in `agents/`.

## Regola non negoziabile

**Nessun servizio in `backend/services/*` importa direttamente codice da qui.**
La comunicazione avviene sempre tramite l'API pubblica (un componente AI Platform
che ha bisogno di un dato di CRM chiama l'API di CRM, non legge il suo database)
— coerente con "il Tool Execution Engine è sempre un client dell'API pubblica,
mai un percorso privilegiato" (AI Platform, sezione 12.5).

## Componenti e riferimento alla documentazione

| Componente | Responsabilità in una frase | Sezione di riferimento |
|---|---|---|
| prompt-orchestrator | Costruisce il prompt finale da template versionati + contesto | Sez. 2 |
| context-engine | Decide cosa entra nel prompt (non come si formula) | Sez. 3 |
| memory-engine | Gestisce gli 8 tipi di memoria e il loro ciclo di vita | Sez. 4 |
| knowledge-graph | Nodi/archi temporali, inferenze, spiegabilità dei percorsi | Sez. 5 |
| vector-platform | Embedding, retrieval, reranking, deduplicazione | Sez. 6 |
| model-router | Seleziona il modello per categoria di task, mai hardcoded | Sez. 8 |
| multi-agent-coordinator | Sincronizzazione, priorità, timeout tra agenti attivi | Sez. 9 |
| planning-engine | Scompone task complessi in piani verificabili e modificabili | Sez. 10 |
| tool-execution-engine | Esegue Tool con autorizzazione, audit, rollback | Sez. 12 |
| confidence-engine | Calcola Alta/Media/Bassa affidabilità, mai una percentuale | Sez. 13 |
| safety-engine | Ultimo checkpoint: prompt injection, dati sensibili, soglie | Sez. 14 |
| cost-engine | Routing per costo, cache, riuso risultati intermedi | Sez. 15 |

## Agenti (`agents/`)

Un agente non è un componente architetturale a sé — è una configurazione di
Tool + dominio di competenza che usa i dodici componenti sopra. Coerente con
il catalogo della Costituzione: `sales-agent`, `finance-agent`,
`inventory-agent`, `hr-agent`, `executive-agent`, `compliance-agent`
(`legal-agent`, `marketing-agent`, `customer-care-agent`, `analytics-agent`
del Modulo Chat verranno aggiunti quando i rispettivi Bounded Context
applicativi saranno progettati/implementati).

## Cosa NON deve mai succedere qui (richiamo a sezione 17, Apprendimento)

Nessun codice in questo albero deve mai modificare autonomamente: le regole
di business, i template di prompt in produzione, il proprio livello di
autonomia, la matrice RBAC. Se durante lo sviluppo emerge la tentazione di
far "auto-ottimizzare" uno di questi elementi per comodità, è un segnale da
fermare e discutere esplicitamente, non da implementare silenziosamente.
