import { Body, Controller, Get, Post, Param, HttpCode, HttpStatus, Req, UseInterceptors, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { successEnvelope } from '@aios/api-contract';
import type { AuthenticatedRequestUser } from '@aios/rbac';
import { AuditLogInterceptor, AuditAction } from '@aios/rbac';
import { OnboardingUseCaseFactory } from '../infrastructure/onboarding-use-case.factory';

/**
 * `POST /api/v1/first-meeting/sessions` — avvia una nuova sessione.
 * `GET /api/v1/first-meeting/sessions/:id` — legge lo stato di una
 * sessione (utile per verificare se il provisioning è completo dopo
 * un'interruzione, senza dover ritentare il provisioning stesso solo
 * per saperlo).
 *
 * Nessun @RequirePermission, stessa motivazione di ProvisioningController:
 * un utente senza ancora un'Organization non può avere alcun grant.
 */
@Controller('api/v1/first-meeting')
@UseInterceptors(AuditLogInterceptor)
export class SessionController {
  constructor(private readonly useCases: OnboardingUseCaseFactory) {}

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @AuditAction('onboarding.session.start', 'Organization')
  async start(@Req() req: Request) {
    const meta = this.buildMeta(req);
    const user = (req as Request & { user?: AuthenticatedRequestUser }).user;
    const result = await this.useCases.startConversation({ userId: user?.userId ?? 'unknown' });
    return successEnvelope(result, meta);
  }

  @Get('sessions/:id')
  async getById(@Param('id') id: string, @Req() req: Request) {
    const meta = this.buildMeta(req);
    const session = await this.useCases.getConversationSession(id);
    if (!session) {
      throw new NotFoundException('Sessione di conversazione non trovata.');
    }
    return successEnvelope(
      {
        conversationId: session.id,
        status: session.status,
        organizationId: session.organizationId,
        // Esposizione generica dei passi — coerente col modello a passi
        // dinamici (Incremento 6): nessun campo dedicato per singola
        // attività, valido oggi per il provisioning e domani per
        // qualunque altra attività senza dover cambiare questa risposta.
        steps: session.steps,
      },
      meta,
    );
  }

  private buildMeta(req: Request) {
    return {
      request_id: `req_${randomUUID()}`,
      correlation_id: (req.headers['x-correlation-id'] as string) ?? `corr_${randomUUID()}`,
      trace_id: (req.headers['x-trace-id'] as string) ?? `trace_${randomUUID()}`,
      version: 'v1',
    };
  }
}
