import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ServiceTokenVerifier } from './service-token';
import { ALLOWED_SERVICES_KEY } from './allow-services.decorator';

/**
 * Protegge gli endpoint interni, non pensati per essere pubblici, da
 * chiamate non autenticate — indipendentemente da come vengono
 * raggiunti (chiamata diretta service-to-service, o attraverso il
 * Gateway, che oggi inoltra l'intero prefisso di ogni servizio senza
 * distinguere endpoint pubblici da interni).
 *
 * Fail-closed per progetto: un endpoint protetto da questo Guard senza
 * @AllowServices dichiarato è considerato un errore di configurazione,
 * mai un accesso permesso di default — a differenza di PermissionGuard,
 * dove "nessun permesso richiesto" è uno stato legittimo per endpoint
 * pubblici come la creazione della prima Organization. Qui non esiste
 * un equivalente: se applichi questo Guard, l'endpoint è interno per
 * definizione.
 */
@Injectable()
export class ServiceAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: ServiceTokenVerifier,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedServices = this.reflector.getAllAndOverride<string[] | undefined>(ALLOWED_SERVICES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!allowedServices || allowedServices.length === 0) {
      throw new ForbiddenException('Endpoint interno senza servizi autorizzati dichiarati (@AllowServices mancante).');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const rawHeader = request.headers['x-internal-service-token'];
    const token = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (!token) {
      throw new UnauthorizedException('Header X-Internal-Service-Token mancante.');
    }

    // ServiceTokenVerifier.verify lancia InvalidServiceTokenError, un
    // Error semplice — se lasciato propagare da un Guard (che esegue
    // prima del metodo del controller), NestJS non saprebbe mapparlo e
    // risponderebbe con un 500 generico invece di un 401. Stessa
    // identica lezione già imparata e corretta su JwtAuthGuard
    // (Identity) — la traduciamo qui in UnauthorizedException, che
    // NestJS riconosce nativamente.
    let claims;
    try {
      claims = this.verifier.verify(token);
    } catch {
      throw new UnauthorizedException('Token di servizio non valido o scaduto.');
    }

    if (!allowedServices.includes(claims.service)) {
      throw new ForbiddenException(`Il servizio '${claims.service}' non è autorizzato a chiamare questo endpoint.`);
    }

    return true;
  }
}
