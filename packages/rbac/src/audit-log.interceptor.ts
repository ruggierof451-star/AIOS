// Necessario perché Reflect.getMetadata (usato più sotto) sia
// riconosciuto: 'reflect-metadata' aumenta l'oggetto globale Reflect
// con questo metodo — senza questo import, sia a runtime sia in fase di
// type-check, Reflect.getMetadata non esiste.
import 'reflect-metadata';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Inject,
  Optional,
  SetMetadata,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { JsonValue } from '@aios/domain-model';
import { AuthenticatedRequestUser } from './permission.guard';

/**
 * Port che ogni servizio deve fornire per scrivere davvero l'audit log
 * (Domain Model, sezione 11.1 — trasversale a ogni Bounded Context).
 * L'interceptor non sa MAI come/dove viene persistito: delega sempre a
 * questo port, coerente con la separazione Bounded Context.
 */
export interface AuditLogWriter {
  write(entry: {
    organizationId: string;
    actorType: 'USER' | 'AGENT';
    actorId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    beforeState: JsonValue | null;
    afterState: JsonValue | null;
  }): Promise<void>;
}

export const AUDIT_LOG_WRITER = Symbol('AUDIT_LOG_WRITER');

/**
 * Implementazione di fallback usata quando nessun AuditLogWriter reale è
 * stato configurato — scrive solo su console. Serve a non far fallire
 * silenziosamente un servizio che non ha ancora cablato la scrittura
 * reale, MA segnala rumorosamente la lacuna invece di fingere che tutto
 * funzioni (coerente con "mai un errore nascosto").
 */
@Injectable()
export class ConsoleAuditLogWriter implements AuditLogWriter {
  async write(entry: Parameters<AuditLogWriter['write']>[0]): Promise<void> {
    // eslint-disable-next-line no-console
    console.warn(
      '[AuditLogInterceptor] Nessun AuditLogWriter reale configurato — voce non persistita:',
      entry,
    );
  }
}

/**
 * Metadato applicato dagli endpoint che vogliono l'audit automatico —
 * analogo a @RequirePermission, ma per la tracciabilità invece che per
 * l'autorizzazione.
 */
export const AUDIT_ACTION_KEY = 'aios:audit_action';
export const AuditAction = (action: string, resourceType: string) =>
  SetMetadata(AUDIT_ACTION_KEY, { action, resourceType });

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    @Optional() @Inject(AUDIT_LOG_WRITER) private readonly writer: AuditLogWriter = new ConsoleAuditLogWriter(),
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const meta = Reflect.getMetadata(AUDIT_ACTION_KEY, context.getHandler()) as
      | { action: string; resourceType: string }
      | undefined;

    if (!meta) {
      return next.handle();
    }

    const user: AuthenticatedRequestUser | undefined = request.user;
    const beforeState = request.body?.__beforeStateForAudit ?? null;

    return next.handle().pipe(
      tap((response: unknown) => {
        if (!user) return; // nessun audit per richieste non autenticate (non dovrebbero arrivare qui comunque)

        const resourceId =
          (response as { data?: { id?: string } })?.data?.id ?? request.params?.id ?? 'unknown';

        void this.writer.write({
          organizationId: user.organizationId,
          actorType: 'USER',
          actorId: user.userId,
          action: meta.action,
          resourceType: meta.resourceType,
          resourceId,
          beforeState,
          afterState: (response as { data?: JsonValue })?.data ?? null,
        });
      }),
    );
  }
}
