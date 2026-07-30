import { Injectable, Inject, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { JwtVerifier, VerifiedAccessTokenClaims } from './jwt-verifier';
import { GrantsResolver, GRANTS_RESOLVER } from './grants-resolver';
import { AuthenticatedRequestUser } from '../permission.guard';

/**
 * Chiude il TODO più importante lasciato aperto dalla Milestone 1
 * (packages/rbac/README.md, "Come si integra"): decodifica il JWT,
 * risolve i grant effettivi per l'Organization attiva, e popola
 * `request.user` in modo che PermissionGuard possa funzionare.
 *
 * Organization attiva: letta dall'header `X-Organization-Id` (il client
 * la imposta in base al Workspace corrente — Costituzione, sezione 6.2,
 * "cambiare workspace non richiede logout"). Se assente, la richiesta
 * prosegue senza organizationId/grants risolti: endpoint che richiedono
 * un'Organization (quasi tutti, tranne health-check e simili) falliranno
 * comunque al PermissionGuard con 403, mai un default silenzioso.
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtVerifier: JwtVerifier,
    // NestJS non può risolvere automaticamente via riflessione un
    // parametro tipizzato come INTERFACCIA (GrantsResolver) — le
    // interfacce TypeScript non esistono più a runtime, quindi
    // `design:paramtypes` le registra genericamente come `Object`,
    // rendendole irrisolvibili senza un token esplicito. Da qui
    // l'errore reale osservato in produzione: "Nest can't resolve
    // dependencies of AuthMiddleware". Ogni modulo che registra questo
    // middleware deve fornire un provider per il token GRANTS_RESOLVER,
    // non per la classe concreta HttpGrantsResolver.
    @Inject(GRANTS_RESOLVER) private readonly grantsResolver: GrantsResolver,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const rawAuthHeader = req.headers['authorization'];
    // Un header può arrivare anche come array (es. ripetuto più volte
    // nella richiesta) — normalizziamo esplicitamente al primo valore
    // invece di assumere che sia sempre una singola stringa, così il
    // codice resta corretto qualunque sia il tipo reale dichiarato da
    // Express per questa proprietà.
    const authHeader = Array.isArray(rawAuthHeader) ? rawAuthHeader[0] : rawAuthHeader;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Header Authorization mancante o malformato.');
    }

    const token = authHeader.slice('Bearer '.length);

    // JwtVerifier.verify lancia InvalidAccessTokenError, un Error
    // semplice — se lasciato propagare da un NestMiddleware (non un
    // Guard/Interceptor, che NestJS avvolge automaticamente nella
    // propria pipeline di eccezioni), Express/NestJS non lo traduce in
    // una risposta HTTP gestita: risultato, un 500 generico invece di un
    // 401. Stessa identica lezione già applicata a JwtAuthGuard
    // (Identity) e a ServiceAuthGuard — qui non era mai stata applicata,
    // perché questo file precede entrambe le correzioni. Trovato durante
    // la Sprint Review reale della Feature 2.1, non dalla verifica
    // statica (che compila il codice, non ne osserva il comportamento a
    // runtime).
    let claims: VerifiedAccessTokenClaims;
    try {
      claims = this.jwtVerifier.verify(token);
    } catch {
      throw new UnauthorizedException('Token di accesso non valido o scaduto.');
    }

    const rawOrganizationId = req.headers['x-organization-id'];
    const organizationId = Array.isArray(rawOrganizationId) ? rawOrganizationId[0] ?? null : rawOrganizationId ?? null;

    let grants: AuthenticatedRequestUser['grants'] = [];
    if (organizationId) {
      grants = await this.grantsResolver.resolve(claims.sub, organizationId);
    }

    const user: AuthenticatedRequestUser = {
      userId: claims.sub,
      organizationId: organizationId ?? '',
      grants,
    };

    (req as Request & { user: AuthenticatedRequestUser }).user = user;
    next();
  }
}
