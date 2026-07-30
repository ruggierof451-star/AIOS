import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionEvaluator, PermissionGrant } from './permission-evaluator';
import { REQUIRED_PERMISSION_KEY } from './require-permission.decorator';

/**
 * Forma minima attesa su `request.user` perché questo Guard funzioni.
 * Popolata da un middleware/guard di autenticazione a monte (non incluso
 * in questo pacchetto — vedi README, sezione "Come si integra").
 */
export interface AuthenticatedRequestUser {
  userId: string;
  organizationId: string;
  grants: PermissionGrant[];
}

/**
 * Guard RBAC riutilizzabile da ogni servizio applicativo (CRM, Finance,
 * Inventory...) — un'unica implementazione, mai una copia locale per
 * servizio, coerente con "un solo modo per fare ogni cosa" (Design
 * System, principio 2) applicato qui alla sicurezza.
 *
 * Applica il principio fail-closed: se `request.user` non è presente o
 * non ha `grants`, l'accesso è negato, mai permesso di default.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredAction = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredAction) return true;

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedRequestUser | undefined = request.user;

    if (!user || !Array.isArray(user.grants)) {
      throw new ForbiddenException('Utente non autenticato o privo di permessi risolti.');
    }

    const resource = request.body?.__resourceContext ?? request.params ?? {};

    const authorized = PermissionEvaluator.isAuthorized(
      {
        userId: user.userId,
        organizationId: user.organizationId,
        grants: user.grants,
        resource,
      },
      requiredAction,
    );

    if (!authorized) {
      // Distinzione diagnostica aggiunta dopo la Sprint Review v1.14: un
      // organizationId vuoto significa che nessun header
      // X-Organization-Id è mai arrivato ad AuthMiddleware — la causa è
      // "il chiamante non ha dichiarato per quale organizzazione sta
      // agendo", non "l'utente non ha questo permesso in questa
      // organizzazione". Prima di questa distinzione, entrambi i casi
      // producevano lo stesso identico messaggio generico, rendendo la
      // diagnosi una congettura (esattamente il bug reale trovato:
      // HttpWorkspaceClient non impostava questo header).
      if (!user.organizationId) {
        throw new ForbiddenException(
          `Permesso mancante: ${requiredAction}. Nessun contesto di organizzazione fornito ` +
            '(header X-Organization-Id assente) — i permessi non sono stati risolti per nessuna organizzazione.',
        );
      }
      throw new ForbiddenException(`Permesso mancante: ${requiredAction}`);
    }

    return true;
  }
}
