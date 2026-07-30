import * as jwt from 'jsonwebtoken';

export interface VerifiedAccessTokenClaims {
  sub: string; // user id
  email: string;
}

export class InvalidAccessTokenError extends Error {
  constructor() {
    super('Il token di accesso non è valido o è scaduto.');
    this.name = 'InvalidAccessTokenError';
  }
}

/**
 * Verifica (mai emette) un access token JWT. L'emissione resta compito
 * esclusivo di Identity (JwtTokenService) — ogni altro servizio deve
 * solo poter VERIFICARE che un token sia autentico, con lo stesso
 * secret condiviso (JWT_SECRET, .env.example).
 */
export class JwtVerifier {
  constructor(private readonly secret: string) {}

  verify(token: string): VerifiedAccessTokenClaims {
    try {
      const decoded = jwt.verify(token, this.secret);
      if (typeof decoded === 'string') throw new InvalidAccessTokenError();
      return decoded as unknown as VerifiedAccessTokenClaims;
    } catch (err) {
      // Il messaggio esposto al chiamante resta deliberatamente generico
      // (non distinguere "scaduto" da "firma non valida" verso un client
      // esterno è una scelta di sicurezza corretta) — ma senza QUESTO log
      // lato server, un secret disallineato tra servizi e un token
      // semplicemente scaduto producono lo stesso identico sintomo
      // osservabile, rendendo la diagnosi una congettura. jsonwebtoken
      // distingue le due cose internamente (TokenExpiredError vs
      // JsonWebTokenError) — la preserviamo qui, non nell'eccezione.
      // eslint-disable-next-line no-console
      console.error(
        `[JwtVerifier] Verifica fallita: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`,
      );
      throw new InvalidAccessTokenError();
    }
  }
}
