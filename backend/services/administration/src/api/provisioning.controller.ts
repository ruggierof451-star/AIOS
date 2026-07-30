import { Body, Controller, Post, Param, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { IsString } from 'class-validator';
import { successEnvelope } from '@aios/api-contract';
import { ServiceAuthGuard, AllowServices } from '@aios/rbac';
import { CreateDefaultRolesUseCase } from '../application/create-default-roles.use-case';

export class CreateDefaultRolesDto {
  @IsString()
  ownerUserId!: string;
}

/**
 * `POST /api/v1/administration/organizations/:id/default-roles`
 *
 * Chiamato dall'orchestratore di provisioning (servizio onboarding)
 * subito dopo la creazione di una nuova Organization. Feature 2.1:
 * protetto da ServiceAuthGuard fin dalla sua introduzione, non aggiunto
 * in un secondo momento — nessuna finestra in cui è stato esposto senza
 * autenticazione.
 */
@Controller('api/v1/administration')
export class ProvisioningController {
  constructor(private readonly createDefaultRolesUseCase: CreateDefaultRolesUseCase) {}

  @Post('organizations/:id/default-roles')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ServiceAuthGuard)
  @AllowServices('onboarding-service')
  async createDefaultRoles(
    @Param('id') organizationId: string,
    @Body() dto: CreateDefaultRolesDto,
    @Req() req: Request,
  ) {
    const result = await this.createDefaultRolesUseCase.execute({
      organizationId,
      ownerUserId: dto.ownerUserId,
    });
    return successEnvelope(result, {
      request_id: `req_${randomUUID()}`,
      correlation_id: (req.headers['x-correlation-id'] as string) ?? `corr_${randomUUID()}`,
      trace_id: (req.headers['x-trace-id'] as string) ?? `trace_${randomUUID()}`,
      version: 'v1',
    });
  }
}
