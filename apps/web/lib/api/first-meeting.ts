/**
 * Primo Incontro — API REALI (onboarding-service via Gateway).
 *
 * Nessun mock qui. Questi sono gli endpoint costruiti nella Feature 2.1
 * (sessione + provisioning) e nella Feature 2.2 Inc. 1 (consenso
 * legale). I contratti rispecchiano la collection Postman in
 * tests/postman/, che resta la fonte di verità.
 *
 * L'ordine delle chiamate NON è libero: il provisioning rifiuta con 409
 * se il consenso non è stato registrato per quella sessione. È un
 * vincolo del server, non una convenzione del client.
 */

import { api } from './client';

export type TipoDocumentoLegale =
  | 'TERMS_OF_SERVICE'
  | 'PRIVACY_POLICY'
  | 'AI_USAGE_CONSENT'
  | 'DPA';

export interface DocumentoLegale {
  documentType: TipoDocumentoLegale | string;
  version: number;
  contentUrl: string;
  effectiveFrom: string;
}

export const NOMI_DOCUMENTI: Record<string, string> = {
  TERMS_OF_SERVICE: 'Termini di servizio',
  PRIVACY_POLICY: 'Informativa privacy',
  AI_USAGE_CONSENT: "Consenso all'uso dell'intelligenza artificiale",
  DPA: 'Accordo sul trattamento dei dati (DPA)',
};

export const SPIEGAZIONI_DOCUMENTI: Record<string, string> = {
  TERMS_OF_SERVICE: 'Le regole del servizio: cosa posso fare, cosa no, e cosa succede se disdici.',
  PRIVACY_POLICY: 'Quali dati raccolgo, per quanto li tengo e come puoi farli cancellare.',
  AI_USAGE_CONSENT:
    'Il permesso di usare l\u2019intelligenza artificiale sui dati della tua azienda. Senza questo non posso ragionare su nulla.',
  DPA: 'Il contratto che mi rende responsabile del trattamento dei tuoi dati per conto tuo, come richiede il GDPR.',
};

/** POST /api/v1/first-meeting/sessions — apre la conversazione. */
export async function avviaSessione(): Promise<{ conversationId: string }> {
  return api<{ conversationId: string }>('/api/v1/first-meeting/sessions', { method: 'POST' });
}

/** GET /api/v1/first-meeting/legal-documents — versioni correnti. */
export async function documentiLegali(): Promise<DocumentoLegale[]> {
  const risposta = await api<{ documents: DocumentoLegale[] }>(
    '/api/v1/first-meeting/legal-documents',
  );
  return risposta.documents;
}

/** POST /api/v1/first-meeting/legal-consent — registra tutti i consensi. */
export async function registraConsenso(
  conversationId: string,
): Promise<{ acceptedDocuments: { documentType: string; version: number }[] }> {
  return api<{ acceptedDocuments: { documentType: string; version: number }[] }>(
    '/api/v1/first-meeting/legal-consent',
    { method: 'POST', body: JSON.stringify({ conversationId }) },
  );
}

/**
 * POST /api/v1/first-meeting/provision — crea Organization, ruoli e
 * Workspace. Idempotente: richiamarla con lo stesso conversationId
 * restituisce gli stessi id invece di creare un secondo ambiente.
 */
export async function creaAmbiente(
  conversationId: string,
  nome: string,
): Promise<{ organizationId: string; workspaceId: string }> {
  return api<{ organizationId: string; workspaceId: string }>(
    '/api/v1/first-meeting/provision',
    { method: 'POST', body: JSON.stringify({ conversationId, name: nome }) },
  );
}
