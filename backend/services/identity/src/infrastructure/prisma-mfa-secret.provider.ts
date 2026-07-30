import { PrismaClient } from '@prisma/client';
import { MfaSecretProvider } from './totp-mfa.verifier';

/**
 * Legge il secret MFA dell'utente dalla colonna `mfa_secret` (schema
 * Prisma, modello User). Nota di sicurezza dichiarata onestamente:
 * questa milestone salva il secret così come generato — la cifratura a
 * riposo di questo campo specifico (oltre alla cifratura generale del
 * database, Infrastructure Modulo 4, sez. 12.4) è un rafforzamento da
 * aggiungere prima di un rilascio in produzione reale, segnalato qui
 * esplicitamente e nel riepilogo della milestone, non implementato
 * silenziosamente come "già a posto".
 */
export class PrismaMfaSecretProvider implements MfaSecretProvider {
  constructor(private readonly prisma: PrismaClient) {}

  async getSecretForUser(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, mfaEnabled: true },
    });
    if (!user || !user.mfaEnabled) return null;
    return user.mfaSecret;
  }
}
