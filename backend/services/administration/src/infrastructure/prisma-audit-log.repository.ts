import { PrismaClient } from '@prisma/client';
import type { AuditLogWriter } from '@aios/rbac';
import type { JsonValue } from '@aios/domain-model';

/**
 * Implementazione reale (non ConsoleAuditLogWriter di fallback) usata
 * dal servizio Administration stesso e, tramite l'endpoint HTTP esposto
 * in api/audit-log.controller.ts, da qualunque altro servizio che
 * preferisca scrivere l'audit via chiamata API invece di un
 * AuditLogWriter locale (Domain Model, sezione 11.1).
 */
export class PrismaAuditLogRepository implements AuditLogWriter {
  constructor(private readonly prisma: PrismaClient) {}

  async write(entry: {
    organizationId: string;
    actorType: 'USER' | 'AGENT';
    actorId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    beforeState: JsonValue | null;
    afterState: JsonValue | null;
  }): Promise<void> {
    // Per una colonna Json nullable, Prisma distingue un valore JSON
    // esplicito da un "column is NULL" — passare qui un `null` letterale
    // richiederebbe i sentinel speciali `Prisma.JsonNull`/`Prisma.DbNull`.
    // Il modo più semplice e type-safe di ottenere "colonna NULL" è
    // ometterla del tutto dall'oggetto `data`, mai passare `null` diretto
    // né un cast: quando prima/dopo non esiste (es. una creazione non ha
    // "prima"), la chiave non compare affatto.
    await this.prisma.auditLogEntry.create({
      data: {
        organizationId: entry.organizationId,
        actorType: entry.actorType,
        actorId: entry.actorId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        ...(entry.beforeState !== null ? { beforeState: entry.beforeState } : {}),
        ...(entry.afterState !== null ? { afterState: entry.afterState } : {}),
      },
    });
  }
}
