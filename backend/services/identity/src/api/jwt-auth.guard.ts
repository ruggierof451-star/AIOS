import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { IdentityUseCaseFactory } from '../infrastructure/identity-use-case.factory';

/**
 * Guard di sola autenticazione per gli endpoint di Identity che la
 * richiedono (es. `GET /api/v1/auth/me`) — deliberatamente DIVERSO dal
 * `PermissionGuard` di `@aios/rbac` usato da Organization/Workspace:
 * quei servizi richiedono anche permessi specifici risolti tramite
 * Administration, mentre qui basta un JWT valido, verificato con lo
 * stesso `TokenService` che Identity usa per emetterlo — nessuna
 * chiamata di rete verso un altro servizio, coerente con Identity come
 * fonte di verità di se stessa per l'autenticazione (Domain Model,
 * sezione 2.1).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly useCases: IdentityUseCaseFactory) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];
    const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;

    if (!headerValue || !headerValue.startsWith('Bearer ')) {
      throw new UnauthorizedException('Header Authorization mancante o malformato.');
    }

    const token = headerValue.slice('Bearer '.length);
    // TokenExpiredOrInvalidError è un Error semplice, non un HttpException:
    // lanciato da un GUARD (non dal controller), NestJS non saprebbe
    // mapparlo a una risposta HTTP significativa e ripiegherebbe sul 500
    // generico — il blocco try/catch del controller non viene mai
    // raggiunto, perché i guard eseguono prima del metodo della rotta.
    // Lo traduciamo qui in UnauthorizedException, che NestJS riconosce
    // nativamente (stesso meccanismo già corretto per il caso "nessun
    // token", pochi righi più sopra).
    let claims;
    try {
      claims = this.useCases.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Il token di accesso non è valido o è scaduto.');
    }

    (request as Request & { userId?: string }).userId = claims.sub;
    return true;
  }
}
