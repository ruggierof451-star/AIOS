# @aios/rbac

Motore di valutazione permessi (shared kernel — Domain Model, sezione 7) +
Guard, Interceptor e Middleware NestJS riutilizzabili da **ogni** servizio
applicativo. Un'unica implementazione, mai copiata localmente in
CRM/Finance/Inventory.

## Come si integra in un nuovo servizio

```ts
import {
  AuthMiddleware, JwtVerifier, HttpGrantsResolver,
  PermissionGuard, RequirePermission,
  AuditLogInterceptor, AuditAction,
} from '@aios/rbac';

// Nel modulo del servizio:
consumer.apply(AuthMiddleware).forRoutes('*');

@Controller('api/v1/customers')
@UseGuards(PermissionGuard)
@UseInterceptors(AuditLogInterceptor)
export class CustomerController {
  @Post()
  @RequirePermission('crm.customer.create')
  @AuditAction('customer.create', 'Customer')
  async create(@Body() dto: CreateCustomerDto) { ... }
}
```

## Decisione presa (Milestone 2): risoluzione dei grant per richiesta

`AuthMiddleware` verifica il JWT (tramite `JwtVerifier`, stesso secret di
Identity) e risolve i grant effettivi chiamando l'API di Administration
(`HttpGrantsResolver`) **ad ogni richiesta**, leggendo l'Organization
attiva dall'header `X-Organization-Id` (impostato dal client in base al
Workspace corrente, coerente con "cambiare workspace non richiede
logout", Costituzione sezione 6.2).

**Alternativa scartata per ora**: incorporare i grant nel JWT al login.
Più performante (zero round-trip per richiesta) ma richiederebbe
invalidare i JWT in circolazione quando un ruolo cambia — complessità
non giustificata in questa fase. Se la latenza di questa chiamata
risultasse un problema misurato, la cache Redis (già nello stack, Step 1)
è l'ottimizzazione naturale da aggiungere per prima, prima di passare

### Attenzione per chi chiama un endpoint protetto da `@RequirePermission`

Se il tuo codice chiama un endpoint di un altro servizio che ha
`@RequirePermission(...)`, **devi impostare l'header
`X-Organization-Id`** — senza, `AuthMiddleware` non risolve alcun grant
(procede silenziosamente con un array vuoto, non fallisce subito) e
`PermissionGuard` rifiuterà con 403, anche se l'utente ha davvero quel
permesso. Bug reale trovato nella Sprint Review v1.14 di Feature 2.1:
`HttpWorkspaceClient` (servizio Onboarding) inoltrava correttamente il
JWT dell'utente ma non impostava questo header, producendo un 403 sempre,
per ogni utente, indipendentemente dai permessi assegnati — un sintomo
che sembrava un problema di RBAC ma era solo un header mai impostato dal
chiamante. `PermissionGuard` distingue ora esplicitamente questo caso nel
proprio messaggio di errore (organizationId vuoto → messaggio diagnostico
dedicato), ma la responsabilità di impostare l'header resta di chi
effettua la chiamata, non di chi la riceve.
all'opzione JWT-embedded.

**Limite dichiarato**: nessuna cache è ancora presente su questa
risoluzione — ogni richiesta autenticata genera una chiamata HTTP ad
Administration. Accettabile per lo sviluppo e per il volume atteso in
questa fase, da rivedere con dati reali di carico.

## Autenticazione service-to-service (Feature 2.1)

Protegge gli endpoint **interni**, non pensati per essere pubblici, da
chiamate non autenticate — indipendentemente da come vengono raggiunti
(chiamata diretta tra servizi, o attraverso il Gateway, che oggi inoltra
l'intero prefisso di ogni servizio senza distinguere endpoint pubblici
da interni).

```ts
import { ServiceAuthGuard, AllowServices, ServiceTokenIssuer, ServiceTokenVerifier } from '@aios/rbac';

// Nel servizio che ESPONE l'endpoint interno:
@Post('organizations/:id/default-roles')
@UseGuards(ServiceAuthGuard)
@AllowServices('onboarding-service')   // fail-closed: nessuna lista = nessun accesso
async createDefaultRoles(...) { ... }

// Nel servizio che CHIAMA l'endpoint interno:
const token = this.serviceTokenIssuer.sign('onboarding-service');
await fetch(url, { headers: { 'X-Internal-Service-Token': token } });
```

**Decisione presa**: token di servizio JWT a vita breve (5 minuti), secret
dedicato (`SERVICE_JWT_SECRET`, `.env.example`) **separato** da `JWT_SECRET`
usato per i token utente — una fuga dell'uno non compromette l'altro. Un
claim `service` dichiara chi sta chiamando; `@AllowServices(...)` verifica
che sia nella lista ammessa per quello specifico endpoint, non solo che
possieda un token valido — permette un'autorizzazione per chiamante, non
solo un controllo binario "conosce il segreto o no".

**Alternative scartate**: un semplice segreto condiviso in un header (più
rapido da scrivere, ma non distingue *chi* sta chiamando, solo se conosce
il segreto) e mTLS reale (lo standard enterprise, ma richiede una PKI e
complica pesantemente anche lo sviluppo locale — sproporzionato per questa
fase del progetto).

**Come evolverà**: il codice applicativo (`ServiceAuthGuard` +
`@AllowServices`) non cambia quando il meccanismo di firma evolverà — oggi
il secret è condiviso tra i servizi; il passo naturale successivo, a scala
maggiore, è passare a chiavi asimmetriche per servizio o a un vero service
mesh con mTLS. Cambia solo *come* arriva la prova di identità, non come
viene verificata l'autorizzazione.

**Limite dichiarato, non implementato silenziosamente come se non
esistesse**: il Gateway continua a inoltrare l'intero prefisso di ogni
servizio pubblicamente — questo meccanismo rende sicuri gli endpoint anche
se raggiunti da lì, ma non restringe *quali percorsi* il Gateway espone.
Rischio residuo accettato, da affrontare in una futura Feature dedicata
all'infrastruttura/API Gateway.

## AuditLogInterceptor — stesso limite di prima

Senza un `AuditLogWriter` reale configurato, l'interceptor usa
`ConsoleAuditLogWriter` (stampa un avviso, non silenzia il problema).
Ogni servizio che vuole l'audit reale deve fornire un writer che chiami
`POST /api/v1/administration/audit-log` (Administration, già disponibile
dalla Milestone 1).
