import { PrismaClientOrTx } from '@aios/eventing';
import type { JsonObject } from '@aios/domain-model';
import {
  ConversationSession,
  ConversationSessionProps,
  ConversationStepInfo,
} from '../domain/conversation-session.entity';

/**
 * CRUD Prisma di basso livello per ConversationSession — dettaglio
 * infrastrutturale interno, usato da PrismaConversationSessionStore per
 * costruire il vero port applicativo (ConversationSessionStore, che
 * aggiunge la semantica transazionale "salva + pubblica evento"). Non
 * implementa direttamente alcuna interfaccia dell'application layer,
 * perché non è iniettato come tale altrove.
 *
 * Incremento 6: i passi (ConversationStep) sono ora righe correlate in
 * una tabella separata, non colonne della sessione — ogni salvataggio
 * fa l'upsert dei soli passi effettivamente presenti nell'aggregate,
 * per chiave composta (sessionId, stepKey).
 */
export class PrismaConversationSessionRepository {
  constructor(private readonly prisma: PrismaClientOrTx) {}

  async findById(id: string): Promise<ConversationSession | null> {
    const record = await this.prisma.conversationSession.findUnique({
      where: { id },
      include: { steps: true },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async save(session: ConversationSession): Promise<void> {
    const props = session.toPersistence();
    const existing = await this.prisma.conversationSession.findUnique({ where: { id: props.id } });

    if (!existing) {
      await this.prisma.conversationSession.create({
        data: { id: props.id, userId: props.userId, organizationId: props.organizationId, status: props.status },
      });
    } else {
      await this.prisma.conversationSession.update({
        where: { id: props.id },
        data: { organizationId: props.organizationId, status: props.status },
      });
    }

    for (const [stepKey, info] of Object.entries(props.steps)) {
      // Stesso principio già in uso per Organization.settings: un campo
      // Json nullable, quando non c'è un valore, va OMESSO del tutto dalla
      // chiave — mai passato come `undefined` esplicito. Il tipo generato
      // da Prisma per un campo Json opzionale (NullableJsonNullValueInput
      // | InputJsonValue) non include `undefined` nella propria unione:
      // con `exactOptionalPropertyTypes` attivo, scrivere la chiave con
      // valore `undefined` è un errore di tipo, non equivalente a ometterla.
      const resultDataField = info.resultData !== null ? { resultData: info.resultData } : {};

      await this.prisma.conversationStep.upsert({
        where: { sessionId_stepKey: { sessionId: props.id, stepKey } },
        create: {
          sessionId: props.id,
          stepKey,
          status: info.status,
          ...resultDataField,
          completedAt: info.completedAt,
        },
        update: {
          status: info.status,
          ...resultDataField,
          completedAt: info.completedAt,
        },
      });
    }
  }

  private toDomain(record: {
    id: string;
    userId: string;
    organizationId: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    steps: Array<{
      stepKey: string;
      status: string;
      resultData: unknown;
      completedAt: Date | null;
    }>;
  }): ConversationSession {
    const steps: Record<string, ConversationStepInfo> = {};
    for (const step of record.steps) {
      steps[step.stepKey] = {
        status: step.status as ConversationStepInfo['status'],
        resultData: (step.resultData as JsonObject | null) ?? null,
        completedAt: step.completedAt,
      };
    }

    const props: ConversationSessionProps = {
      id: record.id,
      userId: record.userId,
      organizationId: record.organizationId,
      status: record.status as ConversationSession['status'],
      steps,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
    return ConversationSession.reconstitute(props);
  }
}
