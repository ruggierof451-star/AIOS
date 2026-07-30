import { Body, Controller, Post, HttpCode, HttpStatus, Req, HttpException, UseInterceptors } from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { successEnvelope, errorEnvelope, ErrorCodes } from '@aios/api-contract';
import type { AuthenticatedRequestUser } from '@aios/rbac';
import { AuditLogInterceptor, AuditAction } from '@aios/rbac';
import { ProvisionTenantDto } from './dto/provisioning.dto';
import { OnboardingUseCaseFactory } from '../infrastructure/onboarding-use-case.factory';
import { ProvisioningStepFailedError, ConversationSessionNotFoundError, LegalConsentRequiredError } from '../application/ports';

/**
 * `POST /api/v1/first-meeting/provision`
 *
 * Richiede un `conversationId` già avviato tramite
 * `POST /api/v1/first-meeting/sessions` (SessionController) — il
 * provisioning è sempre legato a una sessione, mai un'operazione priva
 * di stato: è esattamente ciò che rende possibile riprenderlo in modo
 * sicuro dopo un'interruzione (Incremento 5).
 *
 * Nessun @RequirePermission dichiarato — stessa motivazione già
 * documentata per `POST /api/v1/organizations`: un utente appena
 * registrato non ha ancora alcun grant in nessuna Organization
 * (non esiste ancora), quindi pretendere un permesso pre-esistente
 * per creare la prima renderebbe impossibile l'intero flusso. Richiede
 * solo autenticazione (AuthMiddleware), non un'autorizzazione specifica.
 *
 * AuditLogInterceptor usa qui il proprio fallback ConsoleAuditLogWriter
 * per l'evento di audit applicativo generico — la sessione stessa,
 * however, è ora tracciata in modo interrogabile tramite
 * ConversationSession (Incremento 5), non solo nei log del processo.
 */
@Controller('api/v1/first-meeting')
@UseInterceptors(AuditLogInterceptor)
export class ProvisioningController {
  constructor(private readonly useCases: OnboardingUseCaseFactory) {}

  @Post('provision')
  @HttpCode(HttpStatus.CREATED)
  @AuditAction('onboarding.provision', 'Organization')
  async provision(@Body() dto: ProvisionTenantDto, @Req() req: Request) {
    const meta = this.buildMeta(req);
    try {
      const user = (req as Request & { user?: AuthenticatedRequestUser }).user;
      const userAccessToken = this.extractBearerToken(req);

      const result = await this.useCases.provisionNewTenant({
        conversationId: dto.conversationId,
        name: dto.name,
        ownerUserId: user?.userId ?? 'unknown',
        userAccessToken,
      });
      return successEnvelope(result, meta);
    } catch (err) {
      throw this.toHttpException(err, meta);
    }
  }

  /**
   * Il JWT dell'utente è già stato verificato da AuthMiddleware a monte
   * (altrimenti la richiesta non sarebbe mai arrivata qui) — lo
   * estraiamo di nuovo qui, in forma grezza, solo per inoltrarlo a
   * Organization/Workspace, non per riverificarlo.
   */
  private extractBearerToken(req: Request): string {
    const rawHeader = req.headers['authorization'];
    const headerValue = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    return headerValue?.startsWith('Bearer ') ? headerValue.slice('Bearer '.length) : '';
  }

  private buildMeta(req: Request) {
    return {
      request_id: `req_${randomUUID()}`,
      correlation_id: (req.headers['x-correlation-id'] as string) ?? `corr_${randomUUID()}`,
      trace_id: (req.headers['x-trace-id'] as string) ?? `trace_${randomUUID()}`,
      version: 'v1',
    };
  }

  private toHttpException(err: unknown, meta: ReturnType<ProvisioningController['buildMeta']>): HttpException {
    const traceId = meta.trace_id;

    if (err instanceof ConversationSessionNotFoundError) {
      return new HttpException(
        errorEnvelope(
          {
            code: ErrorCodes.NOT_FOUND,
            message_user: 'Sessione non trovata — avvia una nuova sessione prima di richiedere il provisioning.',
            message_technical: err.message,
            severity: 'warning',
            retryable: false,
            suggestion: null,
            trace_id: traceId,
          },
          meta,
        ),
        HttpStatus.NOT_FOUND,
      );
    }

    if (err instanceof LegalConsentRequiredError) {
      return new HttpException(
        errorEnvelope(
          {
            code: ErrorCodes.CONFLICT,
            message_user:
              "Devi prima accettare i documenti legali richiesti (POST /api/v1/first-meeting/legal-consent) prima di procedere con la creazione dell'ambiente.",
            message_technical: err.message,
            severity: 'warning',
            retryable: false,
            suggestion: null,
            trace_id: traceId,
          },
          meta,
        ),
        HttpStatus.CONFLICT,
      );
    }

    if (err instanceof ProvisioningStepFailedError) {
      return new HttpException(
        errorEnvelope(
          {
            code: ErrorCodes.INTERNAL_ERROR,
            message_user: 'Non è stato possibile completare la creazione dell\'ambiente. Riprova tra poco.',
            message_technical: err.message,
            severity: 'critical',
            retryable: true,
            suggestion: null,
            trace_id: traceId,
          },
          meta,
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // eslint-disable-next-line no-console
    console.error('[ProvisioningController] Errore non mappato:', err);
    return new HttpException(
      errorEnvelope(
        {
          code: ErrorCodes.INTERNAL_ERROR,
          message_user: 'Si è verificato un errore imprevisto. Riprova tra poco.',
          message_technical: err instanceof Error ? err.message : String(err),
          severity: 'critical',
          retryable: true,
          suggestion: null,
          trace_id: traceId,
        },
        meta,
      ),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
