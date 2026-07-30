import { InviteNotifier } from '../application/ports';

/**
 * Nessun servizio di invio email reale (SendGrid, SES, ecc.) è integrato
 * in questa milestone — limite dichiarato esplicitamente, non nascosto.
 * Questa implementazione stampa il link di invito in console, così il
 * flusso resta testabile manualmente end-to-end (l'invito ESISTE
 * davvero nel database ed è accettabile con il token stampato qui),
 * anche senza un vero provider email configurato.
 */
export class ConsoleInviteNotifier implements InviteNotifier {
  async sendInviteEmail(params: { email: string; plainToken: string; workspaceName: string }): Promise<void> {
    console.warn(
      `[ConsoleInviteNotifier] Nessun provider email reale configurato.\n` +
        `  Invito per: ${params.email}\n` +
        `  Workspace: ${params.workspaceName}\n` +
        `  Token (da usare su POST /api/v1/workspaces/invites/accept): ${params.plainToken}`,
    );
  }
}
