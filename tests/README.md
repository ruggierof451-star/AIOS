# Tests (cross-servizio)

Test che non appartengono a un singolo servizio (quelli vivono nel proprio
`<service>/test/`, vedi `backend/services/README.md`) ma verificano il
comportamento attraverso più componenti.

| Cartella | Cosa verifica | Riferimento |
|---|---|---|
| `contract/` | Ogni servizio rispetta l'envelope, l'error model e gli schema JSON dichiarati nell'API Contract | API Contract, Modulo 2, sezione 13 |
| `integration/` | Interazione reale tra 2+ servizi (es. CRM → Eventing → Finance) | Runtime, Modulo 5 |
| `e2e/` | Gli scenari completi descritti nella documentazione, dall'interfaccia fino al database | Runtime, Modulo 5, sezione 15; Product Bible, sezioni "Scenari reali" di ogni modulo |
| `postman/` | Collection manuali per verifica end-to-end tramite Gateway reale (non automatizzate in CI) — una per milestone/feature | Sprint Review Feature 2.1 |

## Regola per ogni nuova milestone

Nessuna milestone applicativa (Milestone 3 in poi, `docs/implementation-plan.md`)
si considera completa senza almeno uno scenario e2e corrispondente qui — i
criteri di completamento di ogni milestone fanno esplicito riferimento a
questi test, non a una verifica solo manuale.
