/**
 * ConversationEngine — il confine dietro cui vive l'intelligenza.
 *
 * Oggi l'implementazione chiama /api/chat (route server di Next, che
 * custodisce la chiave API). Domani la stessa interfaccia potrà puntare
 * al ConversationEngine del backend, senza toccare i componenti.
 *
 * [DECISIONE PROGETTUALE ASSUNTA] La chiamata all'LLM vive in una route
 * server di Next e non nel backend NestJS. Motivo: per la finestra fino
 * a gennaio serve una conversazione reale subito, e il frontend è la
 * superficie in sviluppo attivo; la chiave resta comunque server-side,
 * mai nel browser. Quando la conversazione dovrà orchestrare azioni sui
 * moduli (non solo rispondere), il posto giusto diventa il backend —
 * questo confine è progettato per quello spostamento.
 */

export interface MessaggioConversazione {
  role: 'user' | 'assistant';
  content: unknown;
}

export interface AzioneDaApprovare {
  readonly id: string;
  readonly nome: string;
  readonly riepilogo: string;
  readonly input: Record<string, unknown>;
}

export interface RispostaAios {
  readonly testo: string;
  /** Cosa AIOS ha fatto da sé per informarsi, da mostrare in chiaro. */
  readonly passi: readonly string[];
  /** Azioni che aspettano il tuo ok: il server non le ha eseguite. */
  readonly azioni: readonly AzioneDaApprovare[];
  /** Storico completo, opaco per il chiamante: va rimandato così com'è. */
  readonly messaggi: readonly MessaggioConversazione[];
}

export interface Approvazione {
  readonly id: string;
  readonly esito: 'approvato' | 'rifiutato';
  readonly nota?: string;
}

export interface ConversationEngine {
  rispondi(
    storico: readonly MessaggioConversazione[],
    approvazione?: Approvazione,
  ): Promise<RispostaAios>;
}

export class ApiRouteConversationEngine implements ConversationEngine {
  async rispondi(
    storico: readonly MessaggioConversazione[],
    approvazione?: Approvazione,
  ): Promise<RispostaAios> {
    const risposta = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: storico,
        ...(approvazione ? { approvazione } : {}),
      }),
    });

    const envelope = (await risposta.json()) as {
      data: RispostaAios | null;
      error: { message_user?: string } | null;
    };

    if (!risposta.ok || !envelope.data) {
      throw new Error(
        envelope.error?.message_user ??
          'Non riesco a raggiungere il motore della conversazione.',
      );
    }

    return envelope.data;
  }
}

export const motoreConversazione: ConversationEngine = new ApiRouteConversationEngine();
