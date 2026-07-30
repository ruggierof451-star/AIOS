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

import { CreateWorkspaceDto, InviteUserDto, AcceptInviteDto, ChangeMemberRoleDto } from './dto/workspace.dto';
import { WorkspaceUseCaseFactory } from '../infrastructure/workspace-use-case.factory';
import { WorkspaceNotFoundError, InviteNotFoundError } from '../application/ports';
import {
  WorkspaceAlreadyArchivedError,
  InvalidWorkspaceNameError,
  MemberAlreadyPresentError,
  MemberNotFoundError,
} from '../domain/workspace.entity';
import { InviteAlreadyProcessedError, InviteExpiredError } from '../domain/invite.entity';

@Controller('api/v1/workspaces')
@UseGuards(PermissionGuard)
@UseInterceptors(AuditLogInterceptor)
export class WorkspaceController {
  constructor(private readonly useCases: WorkspaceUseCaseFactory) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('workspace.create')
  @AuditAction('workspace.create', 'Workspace')
  async create(@Body() dto: CreateWorkspaceDto, @Req() req: Request) {
    const meta = this.buildMeta(req);
    try {
      const user = (req as Request & { user?: AuthenticatedRequestUser }).user;
      const result = await this.useCases.createWorkspace({
        organizationId: dto.organizationId,
        name: dto.name,
        creatorUserId: user?.userId ?? 'unknown',
        creatorRoleName: dto.creatorRoleName ?? 'Admin',
      });
      return successEnvelope(result, meta);
    } catch (err) {
      throw this.toHttpException(err, meta);
    }
  }

  @Post(':id/invites')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('workspace.member.invite')
  @AuditAction('workspace.invite.create', 'WorkspaceInvite')
  async invite(@Param('id') workspaceId: string, @Body() dto: InviteUserDto, @Req() req: Request) {
    const meta = this.buildMeta(req);
    try {
      const user = (req as Request & { user?: AuthenticatedRequestUser }).user;
      const result = await this.useCases.inviteUser({
        workspaceId,
        email: dto.email,
        roleName: dto.roleName,
        invitedByUserId: user?.userId ?? 'unknown',
      });
      return successEnvelope(result, meta);
    } catch (err) {
      throw this.toHttpException(err, meta);
    }
  }

  @Post('invites/accept')
  @HttpCode(HttpStatus.OK)
  @AuditAction('workspace.invite.accept', 'WorkspaceInvite')
  async acceptInvite(@Body() dto: AcceptInviteDto, @Req() req: Request) {
    const meta = this.buildMeta(req);
    try {
      const user = (req as Request & { user?: AuthenticatedRequestUser }).user;
      const result = await this.useCases.acceptInvite({
        plainToken: dto.token,
        acceptingUserId: user?.userId ?? 'unknown',
      });
      return successEnvelope(result, meta);
    } catch (err) {
      throw this.toHttpException(err, meta);
    }
  }

  @Delete(':id/members/:userId')
  @RequirePermission('workspace.member.remove')
  @AuditAction('workspace.member.remove', 'Workspace')
  async removeMember(@Param('id') workspaceId: string, @Param('userId') userId: string, @Req() req: Request) {
    const meta = this.buildMeta(req);
    try {
      await this.useCases.removeMember({ workspaceId, userId });
      return successEnvelope({ removed: true }, meta);
    } catch (err) {
      throw this.toHttpException(err, meta);
    }
  }

  @Patch(':id/members/:userId/role')
  @RequirePermission('workspace.member.role.change')
  @AuditAction('workspace.member.role.change', 'Workspace')
  async changeMemberRole(
    @Param('id') workspaceId: string,
    @Param('userId') userId: string,
    @Body() dto: ChangeMemberRoleDto,
    @Req() req: Request,
  ) {
    const meta = this.buildMeta(req);
    try {
      await this.useCases.changeMemberRole({ workspaceId, userId, newRoleName: dto.newRoleName });
      return successEnvelope({ updated: true }, meta);
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

  private toHttpException(err: unknown, meta: ReturnType<WorkspaceController['buildMeta']>): HttpException {
    const traceId = meta.trace_id;

    const notFoundErrors = [WorkspaceNotFoundError, InviteNotFoundError, MemberNotFoundError];
    const conflictErrors = [WorkspaceAlreadyArchivedError, MemberAlreadyPresentError, InviteAlreadyProcessedError, InviteExpiredError];
    const validationErrors = [InvalidWorkspaceNameError];

    if (notFoundErrors.some((E) => err instanceof E)) {
      return new HttpException(
        errorEnvelope(
          {
            code: ErrorCodes.NOT_FOUND,
            message_user: (err as Error).message,
            message_technical: (err as Error).message,
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

    if (conflictErrors.some((E) => err instanceof E)) {
      return new HttpException(
        errorEnvelope(
          {
            code: ErrorCodes.CONFLICT,
            message_user: (err as Error).message,
            message_technical: (err as Error).message,
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

    if (validationErrors.some((E) => err instanceof E)) {
      return new HttpException(
        errorEnvelope(
          {
            code: ErrorCodes.VALIDATION_FAILED,
            message_user: (err as Error).message,
            message_technical: (err as Error).message,
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

    console.error('[WorkspaceController] Errore non mappato:', err);
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
