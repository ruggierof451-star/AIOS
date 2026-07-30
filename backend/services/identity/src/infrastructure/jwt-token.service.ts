import * as jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'node:crypto';
import { AccessTokenClaims, TokenService } from '../application/ports';

export class TokenExpiredOrInvalidError extends Error {
  constructor() {
    super('Il token di accesso non è valido o è scaduto.');
    this.name = 'TokenExpiredOrInvalidError';
  }
}

/**
 * Implementazione JWT del TokenService (API Contract, sezione 2.2).
 * Access token a vita breve (15 minuti di default) — il refresh token
 * vero e proprio non è un JWT: è un valore casuale opaco, il cui hash
 * (mai il valore in chiaro) viene persistito, coerente con "mai un token
 * in chiaro a riposo" già annotato nello schema Prisma.
 */
export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    // Numero di secondi, non una stringa tipo '15m': alcune versioni di
    // @types/jsonwebtoken tipizzano `expiresIn` con un literal type molto
    // stretto per le stringhe (es. solo pattern tipo "15m"), rendendo
    // fragile passare una stringa generica. Un numero di secondi è
    // sempre valido, sempre non ambiguo, senza bisogno di alcun cast.
    private readonly accessTokenTtlSeconds: number = 15 * 60,
  ) {}

  signAccessToken(claims: AccessTokenClaims): string {
    return jwt.sign(claims, this.secret, { expiresIn: this.accessTokenTtlSeconds });
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    try {
      const decoded = jwt.verify(token, this.secret);
      if (typeof decoded === 'string') {
        throw new TokenExpiredOrInvalidError();
      }
      return decoded as unknown as AccessTokenClaims;
    } catch {
      throw new TokenExpiredOrInvalidError();
    }
  }

  generateRefreshTokenValue(): string {
    return randomBytes(64).toString('hex');
  }

  hashRefreshTokenValue(value: string): string {
    // SHA-256 è sufficiente qui: il valore originale ha già alta entropia
    // (64 byte casuali) — non è una password a bassa entropia da proteggere
    // con bcrypt, è un token generato, quindi un hash veloce e deterministico
    // per la ricerca in tabella è la scelta corretta.
    return createHash('sha256').update(value).digest('hex');
  }
}
