import {
  Body,
  Controller,
  Post,
  Patch,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  UseInterceptors,
  HttpException,
} from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { successEnvelope, errorEnvelope, ErrorCodes } from '@aios/api-contract';
import {
  PermissionGuard,
  RequirePermission,
  AuditLogInterceptor,
  AuditAction,
  AuthenticatedRequestUser,
} from '@aios/rbac';

import { CreateOrganizationDto, UpdateOrganizationDto, ChangePlanDto } from './dto/organization.dto';
import { OrganizationUseCaseFactory } from '../infrastructure/organization-use-case.factory';
import { OrganizationNotFoundError } from '../application/ports';
import { InvalidStatusTransitionError, InvalidNameError } from '../domain/organization.entity';

/**
 * `POST /api/v1/organizations`, `PATCH /api/v1/organizations/:id`,
 * `PATCH /api/v1/organizations/:id/plan`, `DELETE /api/v1/organizations/:id`
 * (eliminazione logica — archiviazione, mai una DELETE fisica, coerente
 * con Domain Model sezione 11.3).
 *
 * Protetto da PermissionGuard (richiede @aios/rbac AuthMiddleware attivo
 * a monte, vedi organization.module.ts) e traccia ogni scrittura in
 * audit log tramite AuditLogInterceptor.
 *
 * NOTA IMPORTANTE: la creazione di un'organizzazione NON richiede un
 * @RequirePermission — un utente appena registrato non ha ancora alcun
 * grant assegnato in nessuna Organization (non esiste ancora!), quindi
 * pretendere un permesso pre-esistente per crearne la prima renderebbe
 * impossibile per chiunque creare la propria prima azienda. Richiede
 * solo autenticazione (AuthMiddleware), non un'autorizzazione specifica.
 */
@Controller('api/v1/organizations')
@UseGuards(PermissionGuard)
@UseInterceptors(AuditLogInterceptor)
export class OrganizationController {
  constructor(private readonly useCases: OrganizationUseCaseFactory) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @AuditAction('organization.create', 'Organization')
  async create(@Body() dto: CreateOrganizationDto, @Req() req: Request) {
    const meta = this.buildMeta(req);
    try {
      const user = (req as Request & { user?: AuthenticatedRequestUser }).user;
      // Con `exactOptionalPropertyTypes` attivo, ogni campo opzionale va
      // omesso del tutto quando il client non lo invia, mai passato con
      // valore undefined esplicito.
      const result = await this.useCases.createOrganization({
        name: dto.name,
        ownerUserId: user?.userId ?? 'unknown',
        ...(dto.legalName !== undefined ? { legalName: dto.legalName } : {}),
        ...(dto.plan !== undefined ? { plan: dto.plan } : {}),
        ...(dto.vatNumber !== undefined ? { vatNumber: dto.vatNumber } : {}),
        ...(dto.taxCode !== undefined ? { taxCode: dto.taxCode } : {}),
        ...(dto.pec !== undefined ? { pec: dto.pec } : {}),
        ...(dto.sdi !== undefined ? { sdi: dto.sdi } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.website !== undefined ? { website: dto.website } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.province !== undefined ? { province: dto.province } : {}),
        ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode } : {}),
        ...(dto.country !== undefined ? { country: dto.country } : {}),
        ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
        ...(dto.language !== undefined ? { language: dto.language } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.fiscalYearStart !== undefined ? { fiscalYearStart: dto.fiscalYearStart } : {}),
        ...(dto.fiscalYearEnd !== undefined ? { fiscalYearEnd: dto.fiscalYearEnd } : {}),
      });
      return successEnvelope(result, meta);
    } catch (err) {
      throw this.toHttpException(err, meta);
    }
  }

  @Patch(':id')
  @RequirePermission('organization.update')
  @AuditAction('organization.update', 'Organization')
  async update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto, @Req() req: Request) {
    const meta = this.buildMeta(req);
    try {
      await this.useCases.updateOrganization({
        organizationId: id,
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.settings !== undefined ? { settings: dto.settings } : {}),
      });
      return successEnvelope({ updated: true }, meta);
    } catch (err) {
      throw this.toHttpException(err, meta);
    }
  }

  @Patch(':id/plan')
  @RequirePermission('organization.plan.change')
  @AuditAction('organization.plan.change', 'Organization')
  async changePlan(@Param('id') id: string, @Body() dto: ChangePlanDto, @Req() req: Request) {
    const meta = this.buildMeta(req);
    try {
      await this.useCases.changePlan({ organizationId: id, newPlan: dto.plan });
      return successEnvelope({ updated: true }, meta);
    } catch (err) {
      throw this.toHttpException(err, meta);
    }
  }

  @Delete(':id')
  @RequirePermission('organization.archive')
  @AuditAction('organization.archive', 'Organization')
  async archive(@Param('id') id: string, @Req() req: Request) {
    const meta = this.buildMeta(req);
    try {
      await this.useCases.archiveOrganization({ organizationId: id });
      return successEnvelope({ archived: true }, meta);
    } catch (err) {
      throw this.toHttpException(err, meta);
    }
  }

  private buildMeta(req: Request) {
    return {
      request_id: `req_${randomUUID()}`,
      correlation_id: (req.headers['x-correlation-id'] as string) ?? `corr_${randomUUID()}`,
      trace_id: (req.headers['x-trace-id'] as string) ?? `trace_${randomUUID()}`,
      version: 'v1',
    };
  }

  private toHttpException(err: unknown, meta: ReturnType<OrganizationController['buildMeta']>): HttpException {
    const traceId = meta.trace_id;

    if (err instanceof OrganizationNotFoundError) {
      return new HttpException(
        errorEnvelope(
          {
            code: ErrorCodes.NOT_FOUND,
            message_user: 'Organizzazione non trovata.',
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

    if (err instanceof InvalidStatusTransitionError) {
      return new HttpException(
        errorEnvelope(
          {
            code: ErrorCodes.CONFLICT,
            message_user: 'Questa organizzazione è già stata archiviata.',
            message_technical: err.message,
            severity: 'info',
            retryable: false,
            suggestion: null,
            trace_id: traceId,
          },
          meta,
        ),
        HttpStatus.CONFLICT,
      );
    }

    if (err instanceof InvalidNameError) {
      return new HttpException(
        errorEnvelope(
          {
            code: ErrorCodes.VALIDATION_FAILED,
            message_user: 'Il nome non può essere vuoto.',
            message_technical: err.message,
            severity: 'warning',
            retryable: false,
            suggestion: null,
            trace_id: traceId,
          },
          meta,
        ),
        HttpStatus.BAD_REQUEST,
      );
    }

    // eslint-disable-next-line no-console
    console.error('[OrganizationController] Errore non mappato:', err);
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
