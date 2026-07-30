import { Body, Controller, Post, HttpCode, HttpStatus, Req } from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { IsString, IsIn, IsOptional } from 'class-validator';
import { successEnvelope } from '@aios/api-contract';
import type { JsonValue } from '@aios/domain-model';
import { PrismaAuditLogRepository } from '../infrastructure/prisma-audit-log.repository';

export class CreateAuditLogEntryDto {
  @IsString()
  organizationId!: string;

  @IsIn(['USER', 'AGENT'])
  actorType!: 'USER' | 'AGENT';

  @IsString()
  actorId!: string;

  @IsString()
  action!: string;

  @IsString()
  resourceType!: string;

  @IsString()
  resourceId!: string;

  @IsOptional()
  beforeState?: JsonValue;

  @IsOptional()
  afterState?: JsonValue;
}

/**
 * `POST /api/v1/administration/audit-log`
 *
 * Permette a qualunque altro servizio di scrivere una voce di audit
 * senza dover conoscere lo schema Postgres di Administration (rispetta
 * il confine tra Bounded Context, Domain Model sezione 1.4).
 */
@Controller('api/v1/administration')
export class AuditLogController {
  constructor(private readonly auditLogRepository: PrismaAuditLogRepository) {}

  @Post('audit-log')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateAuditLogEntryDto, @Req() req: Request) {
    // Il DTO ammette beforeState/afterState assenti (undefined, il campo
    // non è stato inviato nel body); write() richiede invece esplicitamente
    // JsonValue | null — normalizziamo qui l'unica differenza di forma tra
    // "input HTTP opzionale" e "contratto interno", senza cast né `any`.
    await this.auditLogRepository.write({
      ...dto,
      beforeState: dto.beforeState ?? null,
      afterState: dto.afterState ?? null,
    });
    return successEnvelope(
      { recorded: true },
      {
        request_id: `req_${randomUUID()}`,
        correlation_id: (req.headers['x-correlation-id'] as string) ?? `corr_${randomUUID()}`,
        trace_id: (req.headers['x-trace-id'] as string) ?? `trace_${randomUUID()}`,
        version: 'v1',
      },
    );
  }
}
