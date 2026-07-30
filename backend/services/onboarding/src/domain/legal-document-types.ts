/**
 * Tipi di documento legale — stesso pattern del Conversation Step
 * Registry (domain/conversation-steps.ts): un oggetto `as const`, non un
 * enum Prisma, per poter aggiungere un nuovo tipo di documento senza
 * migration. `documentType` resta una colonna String semplice.
 */
export const LegalDocumentTypes = {
  TERMS_OF_SERVICE: 'TERMS_OF_SERVICE',
  PRIVACY_POLICY: 'PRIVACY_POLICY',
  AI_USAGE_CONSENT: 'AI_USAGE_CONSENT',
  DPA: 'DPA',
} as const;

export type LegalDocumentType = (typeof LegalDocumentTypes)[keyof typeof LegalDocumentTypes];

/**
 * Decisione progettuale (vedi paragrafo "Decisioni progettuali assunte"
 * nella consegna): questi quattro sono richiesti insieme, in un unico
 * momento della First Conversation — coerente con la progettazione UX
 * già condivisa in precedenza (un'unica card con più caselle distinte,
 * mai un "accetto tutto" collettivo). Il DPA è trattato qui come gli
 * altri tre (accettazione leggera dell'utente fondatore) — una firma
 * elettronica qualificata per contratti enterprise assistiti resta
 * fuori scope, come già segnalato in precedenza.
 */
export const REQUIRED_LEGAL_DOCUMENT_TYPES: readonly LegalDocumentType[] = [
  LegalDocumentTypes.TERMS_OF_SERVICE,
  LegalDocumentTypes.PRIVACY_POLICY,
  LegalDocumentTypes.AI_USAGE_CONSENT,
  LegalDocumentTypes.DPA,
];
