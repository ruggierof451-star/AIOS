import {
  Body,
  Controller,
  Post,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  HttpException,
} from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { successEnvelope, errorEnvelope, ErrorCodes, ApiError } from '@aios/api-contract';

import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IdentityUseCaseFactory } from '../infrastructure/identity-use-case.factory';
import { EmailAlreadyRegisteredError, WeakPasswordError } from '../application/register-user.use-case';
import {
  InvalidCredentialsError,
  MfaCodeRequiredError,
  MfaCodeInvalidError,
} from '../application/authenticate-user.use-case';
import {
  RefreshTokenInvalidError,
  RefreshTokenExpiredOrRevokedError,
} from '../application/refresh-token.use-case';
import { UserNotFoundError } from '../application/get-current-user.use-case';
import { UserSuspendedError } from '../domain/user.entity';
import { InvalidEmailError } from '../domain/email.vo';
import { TokenExpiredOrInvalidError } from '../infrastructure/jwt-token.service';

/**
 * Endpoint coerenti con API Contract (Engineering Bible Modulo 2, sez. 3.6):
 * `POST /api/v1/auth/register`, `POST /api/v1/auth/token` (login),
 * `POST /api/v1/auth/refresh`.
 *
 * Il controller non assembla mai un caso d'uso direttamente — delega
 * sempre a IdentityUseCaseFactory, che garantisce l'esecuzione dentro la
 * transazione corretta (vedi infrastructure/unit-of-work.ts). Questo
 * evita che un futuro endpoint dimentichi la garanzia di atomicità.
 */
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly useCases: IdentityUseCaseFactory) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const meta = this.buildMeta(req);
    try {
      const result = await this.useCases.registerUser({
        email: dto.email,
        password: dto.password,
      });
      return successEnvelope(result, meta);
    } catch (err) {
      throw this.toHttpException(err, meta);
    }
  }

  @Post('token')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const meta = this.buildMeta(req);
    try {
      const result = await this.useCases.authenticateUser({
        email: dto.email,
        password: dto.password,
        // Con `exactOptionalPropertyTypes` attivo, un campo opzionale
        // (`mfaCode?: string`) non può ricevere esplicitamente `undefined`
        // come valore: va omesso del tutto quando assente, mai passato
        // con valore undefined.
        ...(dto.mfaCode !== undefined ? { mfaCode: dto.mfaCode } : {}),
      });
      return successEnvelope(result, meta);
    } catch (err) {
      throw this.toHttpException(err, meta);
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const meta = this.buildMeta(req);
    try {
      const result = await this.useCases.refreshToken({
        refreshToken: dto.refreshToken,
      });
      return successEnvelope(result, meta);
    } catch (err) {
      throw this.toHttpException(err, meta);
    }
  }

  /**
   * Primo endpoint protetto di Identity (Milestone "Sistema di
   * Autenticazione"). Richiede `Authorization: Bearer <access_token>`
   * valido — verificato da JwtAuthGuard, mai un accesso senza JWT.
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Req() req: Request) {
    const meta = this.buildMeta(req);
    try {
      const userId = (req as Request & { userId?: string }).userId;
      const result = await this.useCases.getCurrentUser({ userId: userId ?? '' });
      return successEnvelope(result, meta);
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

  private toHttpException(err: unknown, meta: ReturnType<AuthController['buildMeta']>): HttpException {
    const traceId = meta.trace_id;

    const mapping: Array<{
      matches: (e: unknown) => boolean;
      status: HttpStatus;
      buildError: () => ApiError;
    }> = [
      {
        matches: (e) => e instanceof InvalidEmailError,
        status: HttpStatus.BAD_REQUEST,
        buildError: () => ({
          code: ErrorCodes.VALIDATION_FAILED,
          message_user: 'L\'indirizzo email inserito non è valido.',
          message_technical: (err as Error).message,
          severity: 'warning',
          retryable: false,
          suggestion: 'Controlla di aver scritto correttamente l\'indirizzo email.',
          trace_id: traceId,
        }),
      },
      {
        matches: (e) => e instanceof WeakPasswordError,
        status: HttpStatus.BAD_REQUEST,
        buildError: () => ({
          code: ErrorCodes.VALIDATION_FAILED,
          message_user: 'La password non rispetta i requisiti minimi di sicurezza.',
          message_technical: (err as Error).message,
          severity: 'warning',
          retryable: false,
          suggestion: 'Usa almeno 10 caratteri con lettere e numeri.',
          trace_id: traceId,
        }),
      },
      {
        matches: (e) => e instanceof EmailAlreadyRegisteredError,
        status: HttpStatus.CONFLICT,
        buildError: () => ({
          code: ErrorCodes.EMAIL_ALREADY_REGISTERED,
          message_user: 'Esiste già un account con questa email.',
          message_technical: (err as Error).message,
          severity: 'info',
          retryable: false,
          suggestion: 'Prova ad accedere invece di registrarti, o recupera la password.',
          trace_id: traceId,
        }),
      },
      {
        matches: (e) => e instanceof InvalidCredentialsError,
        status: HttpStatus.UNAUTHORIZED,
        buildError: () => ({
          code: ErrorCodes.INVALID_CREDENTIALS,
          message_user: 'Email o password non corretti.',
          message_technical: (err as Error).message,
          severity: 'warning',
          retryable: true,
          suggestion: null,
          trace_id: traceId,
        }),
      },
      {
        matches: (e) => e instanceof UserSuspendedError,
        status: HttpStatus.FORBIDDEN,
        buildError: () => ({
          code: ErrorCodes.FORBIDDEN,
          message_user: 'Questo account è stato sospeso.',
          message_technical: (err as Error).message,
          severity: 'error',
          retryable: false,
          suggestion: 'Contatta l\'amministratore della tua azienda.',
          trace_id: traceId,
        }),
      },
      {
        matches: (e) => e instanceof MfaCodeRequiredError,
        status: HttpStatus.UNAUTHORIZED,
        buildError: () => ({
          code: ErrorCodes.MFA_CODE_INVALID,
          message_user: 'Inserisci il codice di autenticazione a due fattori.',
          message_technical: (err as Error).message,
          severity: 'info',
          retryable: true,
          suggestion: null,
          trace_id: traceId,
        }),
      },
      {
        matches: (e) => e instanceof MfaCodeInvalidError,
        status: HttpStatus.UNAUTHORIZED,
        buildError: () => ({
          code: ErrorCodes.MFA_CODE_INVALID,
          message_user: 'Il codice di autenticazione a due fattori non è corretto.',
          message_technical: (err as Error).message,
          severity: 'warning',
          retryable: true,
          suggestion: null,
          trace_id: traceId,
        }),
      },
      {
        matches: (e) => e instanceof RefreshTokenInvalidError,
        status: HttpStatus.UNAUTHORIZED,
        buildError: () => ({
          code: ErrorCodes.REFRESH_TOKEN_INVALID,
          message_user: 'Sessione non valida. Effettua nuovamente l\'accesso.',
          message_technical: (err as Error).message,
          severity: 'warning',
          retryable: false,
          suggestion: null,
          trace_id: traceId,
        }),
      },
      {
        matches: (e) => e instanceof RefreshTokenExpiredOrRevokedError,
        status: HttpStatus.UNAUTHORIZED,
        buildError: () => ({
          code: ErrorCodes.REFRESH_TOKEN_EXPIRED,
          message_user: 'La sessione è scaduta. Effettua nuovamente l\'accesso.',
          message_technical: (err as Error).message,
          severity: 'warning',
          retryable: false,
          suggestion: null,
          trace_id: traceId,
        }),
      },
      {
        matches: (e) => e instanceof TokenExpiredOrInvalidError,
        status: HttpStatus.UNAUTHORIZED,
        buildError: () => ({
          code: ErrorCodes.UNAUTHENTICATED,
          message_user: 'Sessione non valida o scaduta. Effettua nuovamente l\'accesso.',
          message_technical: (err as Error).message,
          severity: 'warning',
          retryable: false,
          suggestion: null,
          trace_id: traceId,
        }),
      },
      {
        matches: (e) => e instanceof UserNotFoundError,
        status: HttpStatus.NOT_FOUND,
        buildError: () => ({
          code: ErrorCodes.NOT_FOUND,
          message_user: 'Utente non trovato.',
          message_technical: (err as Error).message,
          severity: 'warning',
          retryable: false,
          suggestion: null,
          trace_id: traceId,
        }),
      },
    ];

    const matched = mapping.find((m) => m.matches(err));

    if (matched) {
      return new HttpException(errorEnvelope(matched.buildError(), meta), matched.status);
    }

    // eslint-disable-next-line no-console
    console.error('[AuthController] Errore non mappato:', err);

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
