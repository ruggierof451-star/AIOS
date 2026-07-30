import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { successEnvelope } from '@aios/api-contract';
import { ServiceAuthGuard, AllowServices } from '@aios/rbac';
import { GetUserGrantsUseCase } from '../application/get-user-grants.use-case';

/**
 * `GET /api/v1/administration/users/:userId/grants?organizationId=...`
 *
 * Usato da ogni servizio con AuthMiddleware attivo (Organization,
 * Workspace) per risolvere i permessi effettivi di un utente. Feature
 * 2.1: protetto da ServiceAuthGuard — chiude il limite dichiarato nelle
 * milestone precedenti (nessuna autenticazione service-to-service).
 */
@Controller('api/v1/administration')
export class GrantsController {
  constructor(private readonly getUserGrantsUseCase: GetUserGrantsUseCase) {}

  @Get('users/:userId/grants')
  @UseGuards(ServiceAuthGuard)
  @AllowServices('organization-service', 'workspace-service', 'onboarding-service')
  async getGrants(
    @Param('userId') userId: string,
    @Query('organizationId') organizationId: string,
    @Req() req: Request,
  ) {
    const grants = await this.getUserGrantsUseCase.execute({ userId, organizationId });
    return successEnvelope(
      { grants },
      {
        request_id: `req_${randomUUID()}`,
        correlation_id: (req.headers['x-correlation-id'] as string) ?? `corr_${randomUUID()}`,
        trace_id: (req.headers['x-trace-id'] as string) ?? `trace_${randomUUID()}`,
        version: 'v1',
      },
    );
  }
}
