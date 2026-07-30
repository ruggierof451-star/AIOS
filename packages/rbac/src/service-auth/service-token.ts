import * as jwt from 'jsonwebtoken';

export interface ServiceTokenClaims {
  service: string;
}

export class InvalidServiceTokenError extends Error {
  constructor() {
    super('Il token di servizio non è valido o è scaduto.');
    this.name = 'InvalidServiceTokenError';
  }
}

const SERVICE_TOKEN_TTL_SECONDS = 5 * 60;

/**
 * Autenticazione service-to-service (Feature 2.1). Ogni servizio firma
 * un token a vita breve prima di chiamare un endpoint interno di un
 * altro servizio — secret dedicato (SERVICE_JWT_SECRET, .env.example),
 * separato da JWT_SECRET usato per i token utente: una fuga dell'uno
 * non compromette l'altro.
 *
 * Stesso numero di secondi, non una stringa tipo '5m', per lo stesso
 * motivo già documentato in JwtTokenService (Identity): alcune versioni
 * di @types/jsonwebtoken tipizzano `expiresIn` in modo troppo stretto
 * per accettare una stringa generica.
 */
export class ServiceTokenIssuer {
  constructor(private readonly secret: string) {}

  sign(serviceName: string): string {
    const claims: ServiceTokenClaims = { service: serviceName };
    return jwt.sign(claims, this.secret, { expiresIn: SERVICE_TOKEN_TTL_SECONDS });
  }
}

/**
 * Verifica (mai emette) un token di servizio — stessa separazione di
 * responsabilità già in uso in JwtVerifier per i token utente.
 */
export class ServiceTokenVerifier {
  constructor(private readonly secret: string) {}

  verify(token: string): ServiceTokenClaims {
    try {
      const decoded = jwt.verify(token, this.secret);
      if (typeof decoded === 'string') throw new InvalidServiceTokenError();
      const claims = decoded as unknown as ServiceTokenClaims;
      if (typeof claims.service !== 'string') throw new InvalidServiceTokenError();
      return claims;
    } catch {
      throw new InvalidServiceTokenError();
    }
  }
}
