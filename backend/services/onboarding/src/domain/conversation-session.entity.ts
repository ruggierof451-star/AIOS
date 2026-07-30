/**
 * ConversationSession — Aggregate Root del Bounded Context Onboarding.
 *
 * Incremento 6: modello a passi dinamici, non più campi dedicati per
 * ciascuna attività. Vedi packages/domain-model/prisma/schema.prisma
 * per la motivazione completa della scelta (scartata sia la crescita
 * per colonne sia una macchina a stati con stati nominati).
 *
 * `organizationId` resta un campo reale dell'aggregate (lega la
 * sessione al tenant). Ogni altra attività — provisioning oggi, import/
 * AI/documenti in futuro — è un passo generico identificato da una
 * stringa (`stepKey`), tracciato con `completeStep`/`failStep`. Questo
 * aggregate non sa nulla del SIGNIFICATO dei singoli passi (non
 * conosce "Organization" o "Workspace" come concetti) — quella
 * conoscenza appartiene a chi lo usa (es. l'orchestratore di
 * provisioning), non all'aggregate stesso: è esattamente ciò che lo
 * rende generico.
 */

import type { JsonObject } from '@aios/domain-model';
import { generateUuidV7 } from '@aios/domain-model';

export type ConversationSessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
export type ConversationStepStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export class InvalidConversationSessionStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidConversationSessionStateError';
  }
}

export interface ConversationStepInfo {
  status: ConversationStepStatus;
  resultData: JsonObject | null;
  completedAt: Date | null;
}

export interface ConversationSessionProps {
  id: string;
  userId: string;
  organizationId: string | null;
  status: ConversationSessionStatus;
  steps: Record<string, ConversationStepInfo>;
  createdAt: Date;
  updatedAt: Date;
}

export class ConversationSession {
  private constructor(private props: ConversationSessionProps) {}

  static start(params: { userId: string }): ConversationSession {
    return new ConversationSession({
      id: generateUuidV7(),
      userId: params.userId,
      organizationId: null,
      status: 'IN_PROGRESS',
      steps: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: ConversationSessionProps): ConversationSession {
    return new ConversationSession(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get organizationId(): string | null {
    return this.props.organizationId;
  }

  get status(): ConversationSessionStatus {
    return this.props.status;
  }

  /** Tutti i passi registrati finora, per una lettura completa (es. API di stato). */
  get steps(): Record<string, ConversationStepInfo> {
    return { ...this.props.steps };
  }

  getStep(stepKey: string): ConversationStepInfo | null {
    return this.props.steps[stepKey] ?? null;
  }

  isStepComplete(stepKey: string): boolean {
    return this.props.steps[stepKey]?.status === 'COMPLETED';
  }

  areStepsComplete(stepKeys: string[]): boolean {
    return stepKeys.every((key) => this.isStepComplete(key));
  }

  /**
   * Collega la sessione a un'organizzazione — relazione dell'aggregate,
   * non un passo come gli altri (vedi motivazione nello schema Prisma).
   * Idempotente se richiamato con lo stesso id; solleva se si tenta di
   * ricollegare a un'organizzazione diversa (non dovrebbe mai accadere
   * in un flusso corretto, ma è un errore da segnalare, non da ignorare).
   */
  linkToOrganization(organizationId: string): void {
    if (this.props.organizationId !== null && this.props.organizationId !== organizationId) {
      throw new InvalidConversationSessionStateError(
        "Questa sessione è già collegata a un'altra organizzazione.",
      );
    }
    this.props.organizationId = organizationId;
    this.touch();
  }

  /**
   * Registra il completamento di un passo generico. Idempotente: se il
   * passo è già COMPLETED, non fa nulla — richiamarlo di nuovo durante
   * una ripresa non è un errore.
   */
  completeStep(stepKey: string, resultData: JsonObject | null = null): void {
    this.assertNotTerminal();
    const existing = this.props.steps[stepKey];
    if (existing?.status === 'COMPLETED') return;
    this.props.steps[stepKey] = { status: 'COMPLETED', resultData, completedAt: new Date() };
    this.touch();
  }

  /** Registra il fallimento di un passo, preservando un eventuale risultato parziale già noto. */
  failStep(stepKey: string): void {
    this.assertNotTerminal();
    const existing = this.props.steps[stepKey];
    this.props.steps[stepKey] = {
      status: 'FAILED',
      resultData: existing?.resultData ?? null,
      completedAt: null,
    };
    this.touch();
  }

  /** Segna l'intera sessione come completata — decisione di chi la usa (es. l'orchestratore), non di questo aggregate. */
  markCompleted(): void {
    this.assertNotTerminal();
    this.props.status = 'COMPLETED';
    this.touch();
  }

  /**
   * Segna l'intera sessione come fallita — non terminale in senso
   * assoluto: i passi già completati restano registrati, una ripresa
   * successiva riparte dal passo mancante. Serve per l'osservabilità,
   * non per bloccare ulteriori tentativi.
   */
  markFailed(): void {
    if (this.props.status === 'COMPLETED') {
      throw new InvalidConversationSessionStateError(
        'Una sessione già completata non può essere segnata come fallita.',
      );
    }
    this.props.status = 'FAILED';
    this.touch();
  }

  /** Permette di ritentare una sessione precedentemente fallita, senza toccare i passi già registrati. */
  resume(): void {
    if (this.props.status === 'COMPLETED') {
      throw new InvalidConversationSessionStateError('Una sessione già completata non necessita di ripresa.');
    }
    this.props.status = 'IN_PROGRESS';
    this.touch();
  }

  private assertNotTerminal(): void {
    if (this.props.status === 'COMPLETED') {
      throw new InvalidConversationSessionStateError('Questa sessione è già stata completata.');
    }
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }

  toPersistence(): ConversationSessionProps {
    return { ...this.props, steps: { ...this.props.steps } };
  }
}
