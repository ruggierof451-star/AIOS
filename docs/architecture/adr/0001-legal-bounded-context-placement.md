# ADR 0001: Bounded Context Legal separato concettualmente, non come servizio a sé

**Stato:** Accepted
**Data:** 2026-07-26
**Decisori:** CTO (Claude), con delega esplicita per decisioni locali coerenti con la visione già definita (vedi metodo di sviluppo, Feature 2.2)

## Contesto

Feature 2.2 richiede di tracciare il consenso legale (Termini di Servizio, Privacy Policy, Consenso uso AI, DPA) durante la First Conversation, prima che il provisioning possa procedere. Il consenso legale ha regole proprie — immutabilità stretta (mai un update, mai una cancellazione applicativa), versionamento dei documenti, retention potenzialmente diversa da quella del resto del provisioning — concettualmente distinte da `ConversationSession`/`ConversationStep` (Feature 2.1).

La domanda: questo giustifica un nuovo servizio dedicato, o un nuovo Bounded Context concettuale che vive comunque dentro `onboarding-service`?

## Decisione

Un nuovo Bounded Context concettuale ("Legal"), con un proprio schema Postgres (`legal`, separato da `onboarding`) e propri modelli (`LegalDocumentVersion`, `LegalDocumentAcceptance`) — ma **nessun nuovo servizio NestJS**. Vive dentro `onboarding-service`, con la propria applicazione/dominio/infrastruttura organizzati in file dedicati (`legal-consent-ports.ts`, `legal-document-*.ts`), non mescolati con quelli di provisioning.

## Alternative considerate

- **Nuovo servizio dedicato (`legal-service`)**: scartata. Operativamente il consenso legale è sempre invocato nello stesso flusso di First Conversation, mai da un contesto indipendente — un servizio a sé introdurrebbe un salto di rete e una nuova autenticazione service-to-service per un beneficio pratico assente oggi (nessun altro bounded context ha bisogno di leggere/scrivere consenso legale indipendentemente da Onboarding). Stessa logica già applicata al Conversation Step Registry (Incremento 7, Feature 2.1): non estrarre finché non c'è un bisogno reale da un altro contesto.
- **Stesso schema (`onboarding`) di ConversationSession**: scartata. `ConversationStep` è generico e agnostico per progettazione (Incremento 6) — mischiarvi tabelle con regole di immutabilità/retention specifiche del dominio legale avrebbe eroso quella genericità, rendendo lo schema `onboarding` meno leggibile per chi lo consulta senza contesto legale in mente.

## Conseguenze

**Positive**: confine concettuale chiaro (query, backup, retention del consenso legale possono evolvere indipendentemente da quelle del provisioning) senza il costo operativo di un servizio in più. Nessuna nuova autenticazione service-to-service necessaria.

**Accettate**: se in futuro un altro Bounded Context (es. un futuro modulo Documents/Compliance) avrà bisogno di leggere il consenso legale indipendentemente da Onboarding, questa decisione andrà rivalutata — non è preclusa, solo non anticipata ora. Il costo di quella futura estrazione resta contenuto: uno schema Postgres già separato è più facile da migrare verso un servizio dedicato di quanto lo sarebbe un mix di tabelle nello stesso schema.

## Riferimenti

`packages/domain-model/prisma/schema.prisma` (sezione LEGAL); `backend/services/onboarding/src/application/legal-consent-ports.ts`; Feature 2.1, Incremento 7 (stesso principio di non-estrazione prematura, applicato al Conversation Step Registry).
