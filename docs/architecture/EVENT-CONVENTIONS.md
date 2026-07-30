# Convenzioni sugli Eventi di Dominio — Standard Ufficiale AIOS

**Stato:** Definitivo, fissato durante la Feature 2.1 (Incremento 6). Vincolante per ogni bounded context, presente e futuro.

Questo documento esiste perché, prima di essere scritto, la convenzione era
solo un'intenzione condivisa in una conversazione — non verificabile da
chiunque si unisse al progetto in seguito. Da qui in avanti, è verificabile.

---

## 1. Nome dell'evento

Forma: **`<NomeAggregate><VerboAlPassato>`**, PascalCase, senza punti.

`<NomeAggregate>` è sempre il **nome tecnico reale** dell'aggregate nel
dominio — **mai** un nome di prodotto o di esperienza utente. Esempi corretti:
`OrganizationCreated`, `WorkspaceCreated`, `ConversationSessionStarted`.

**Esempio concreto dell'errore che questa regola previene**: durante
l'Incremento 5, il servizio Onboarding pubblicava eventi chiamati
`FirstMeetingStarted`, `FirstMeetingOrganizationProvisioned` — "First
Meeting" è il nome con cui il prodotto si presenta all'utente, non il nome
dell'aggregate (che è, tecnicamente, `ConversationSession`). Corretto
nell'Incremento 6 in `ConversationSessionStarted`,
`ConversationSessionOrganizationProvisioned`. La stessa separazione già
adottata per servizio interno (`onboarding-service`) vs percorso pubblico
(`/api/v1/first-meeting`) si applica identica qui: il nome tecnico non
segue mai il linguaggio di prodotto.

## 2. Tempo verbale: solo passato

Un evento descrive un fatto già accaduto e immutabile. Non useremo mai un
evento con nome imperativo o al presente (`CreateOrganization` sarebbe un
comando, non un evento — se mai un domani introdurremo comandi come
concetto distinto, avranno una propria convenzione separata, non questa).

## 3. Chiavi del payload: `snake_case`

Coerente con il resto del progetto (`organization_id`, `owner_user_id`,
`conversation_id`). Il codice TypeScript che costruisce il payload resta
`camelCase` per le proprie variabili — è solo la struttura serializzata nel
payload a usare `snake_case`.

## 4. Un'unica interfaccia condivisa: `DomainEvent` / `DomainEventPublisher`

Importati **sempre** da `@aios/eventing` — mai ridichiarati localmente in
un bounded context. Prima del consolidamento (Incremento 6), Organization,
Workspace e Onboarding avevano ciascuno una propria dichiarazione
strutturalmente identica ma tecnicamente distinta — un rischio concreto:
un tipo importato per errore da un servizio diverso non sarebbe stato
segnalato dal compilatore, solo scoperto a runtime.

```ts
import { DomainEvent, DomainEventPublisher, PrismaOutboxEventPublisher } from '@aios/eventing';
```

Se il tuo bounded context ha bisogno di un tipo evento nella propria
`ports.ts`, riesportalo da qui — non dichiararne uno nuovo:

```ts
export type { DomainEvent, DomainEventPublisher } from '@aios/eventing';
```

## 5. `schema_version` nel payload

Ogni payload include `schema_version: <numero intero>`, a partire da `1`.
Non è urgente con il volume di eventi attuale, ma un evento pubblicato oggi
potrà essere consumato da un servizio non ancora scritto tra anni — un
consumer futuro deve poter distinguere quale forma del payload sta
leggendo senza ambiguità. Quando la forma di un payload cambia in modo
incompatibile, incrementa `schema_version`; non modificare silenziosamente
il significato di un campo esistente a parità di versione.

```ts
payload: { schema_version: 1, organization_id: organization.id, ... }
```

---

## Catalogo degli eventi attuali (riferimento, non normativo — la fonte di verità è il codice)

| Evento | Bounded Context | Pubblicato da |
|---|---|---|
| `OrganizationCreated` | Organization | `CreateOrganizationUseCase` |
| `OrganizationUpdated` | Organization | `UpdateOrganizationUseCase` |
| `OrganizationPlanChanged` | Organization | `ChangeOrganizationPlanUseCase` |
| `OrganizationArchived` | Organization | `ArchiveOrganizationUseCase` |
| `WorkspaceCreated` | Workspace | `CreateWorkspaceUseCase` |
| `WorkspaceInviteCreated` | Workspace | `InviteUserUseCase` |
| `WorkspaceMemberAdded` | Workspace | `AcceptInviteUseCase` |
| `WorkspaceMemberRemoved` | Workspace | `RemoveMemberUseCase` |
| `WorkspaceMemberRoleChanged` | Workspace | `ChangeMemberRoleUseCase` |
| `ConversationSessionStarted` | Onboarding | `StartConversationUseCase` |
| `ConversationSessionOrganizationProvisioned` | Onboarding | `ProvisionNewTenantUseCase` |
| `ConversationSessionRolesProvisioned` | Onboarding | `ProvisionNewTenantUseCase` |
| `ConversationSessionProvisioningCompleted` | Onboarding | `ProvisionNewTenantUseCase` |
| `ConversationSessionProvisioningFailed` | Onboarding | `ProvisionNewTenantUseCase` |
| `LegalDocumentAccepted` | Legal (in onboarding-service) | `RecordLegalConsentUseCase` |

Administration non pubblica eventi propri (per ora) — le sue scritture
(provisioning ruoli, audit log) non hanno ancora un consumer che ne
giustifichi la pubblicazione. Se in futuro servirà, si aggiunge qui,
seguendo le stesse cinque regole sopra.

## Checklist prima di aggiungere un nuovo evento

1. Il nome è `<NomeAggregate><VerboAlPassato>`? L'aggregate è il nome tecnico, non un termine di prodotto?
2. Hai importato `DomainEvent`/`DomainEventPublisher` da `@aios/eventing`, non ridichiarato un tipo locale?
3. Le chiavi del payload sono `snake_case`?
4. Il payload include `schema_version`?
5. Hai aggiunto una riga al catalogo sopra?
