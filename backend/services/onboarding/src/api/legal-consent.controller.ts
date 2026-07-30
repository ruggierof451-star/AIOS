import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  HttpCode,
  HttpStatus,
  HttpException,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { successEnvelope, errorEnvelope, ErrorCodes } from '@aios/api-contract';
import type { AuthenticatedRequestUser } from '@aios/rbac';
import { AuditLogInterceptor, AuditAction } from '@aios/rbac';
import { RecordLegalConsentDto } from './dto/legal-consent.dto';
import { OnboardingUseCaseFactory } from '../infrastructure/onboarding-use-case.factory';
import { ConversationSessionNotFoundError } from '../application/ports';
import { LegalDocumentVersionMissingError } from '../application/legal-consent-ports';

/**
 * `GET /api/v1/first-meeting/legal-documents` — versioni correnti dei
 * documenti richiesti, da mostrare/collegare prima di chiedere il
 * consenso (non ha senso chiedere di accettare qualcosa che non si può
 * leggere).
 *
 * `POST /api/v1/first-meeting/legal-consent` — registra l'accettazione
 * di tutti i documenti richiesti in un'unica chiamata, coerente con la
 * progettazione UX già condivisa (un'unica card con più caselle
 * distinte, non un passo per documento).
 */
@Controller('api/v1/first-meeting')
@UseInterceptors(AuditLogInterceptor)
export class LegalConsentController {
  constructor(private readonly useCases: OnboardingUseCaseFactory) {}

  @Get('legal-documents')
  async getCurrentDocuments(@Req() req: Request) {
    const meta = this.buildMeta(req);
    const documents = await this.useCases.getCurrentLegalDocuments();
    return successEnvelope({ documents }, meta);
  }

  @Post('legal-consent')
  @HttpCode(HttpStatus.CREATED)
  @AuditAction('onboarding.legal_consent.record', 'Organization')
  async recordConsent(@Body() dto: RecordLegalConsentDto, @Req() req: Request) {
    const meta = this.buildMeta(req);
    try {
      const user = (req as Request & { user?: AuthenticatedRequestUser }).user;
      const ipAddress = this.extractClientIp(req);
      const userAgent = this.extractUserAgent(req);
      const result = await this.useCases.recordLegalConsent({
        conversationId: dto.conversationId,
        userId: user?.userId ?? 'unknown',
        // Stesso principio già applicato altrove (Organization.settings,
        // ConversationStep.resultData): con `exactOptionalPropertyTypes`
        // attivo, una chiave opzionale va omessa del tutto quando manca
        // un valore, mai passata con `undefined` esplicito.
        ...(ipAddress !== undefined ? { ipAddress } : {}),
        ...(userAgent !== undefined ? { userAgent } : {}),
      });
      return successEnvelope(result, meta);
    } catch (err) {
      throw this.toHttpException(err, meta);
    }
  }

  private extractClientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim();
    return req.socket?.remoteAddress;
  }

  private extractUserAgent(req: Request): string | undefined {
    const raw = req.headers['user-agent'];
    return Array.isArray(raw) ? raw[0] : raw;
  }

  private buildMeta(req: Request) {
    return {
      request_id: `req_${randomUUID()}`,
      correlation_id: (req.headers['x-correlation-id'] as string) ?? `corr_${randomUUID()}`,
      trace_id: (req.headers['x-trace-id'] as string) ?? `trace_${randomUUID()}`,
      version: 'v1',
    };
  }

  private toHttpException(err: unknown, meta: ReturnType<LegalConsentController['buildMeta']>): HttpException {
    const traceId = meta.trace_id;

    if (err instanceof ConversationSessionNotFoundError) {
      return new HttpException(
        errorEnvelope(
          {
            code: ErrorCodes.NOT_FOUND,
            message_user: 'Sessione non trovata — avvia una nuova sessione prima di registrare il consenso.',
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

    if (err instanceof LegalDocumentVersionMissingError) {
      // Errore di configurazione (un documento richiesto senza versione
      // pubblicata) — mai colpa dell'utente, ma nemmeno un dettaglio da
      // nascondere: severity critical, così un operatore lo nota subito.
      return new HttpException(
        errorEnvelope(
          {
            code: ErrorCodes.INTERNAL_ERROR,
            message_user: 'Non è stato possibile registrare il consenso in questo momento. Riprova tra poco.',
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
    console.error('[LegalConsentController] Errore non mappato:', err);
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
