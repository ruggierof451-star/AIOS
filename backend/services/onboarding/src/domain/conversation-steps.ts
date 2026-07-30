/**
 * Conversation Step Registry — punto unico in cui elencare le chiavi
 * ufficiali dei passi di una ConversationSession, per ridurre il
 * rischio di chiavi simili ma incoerenti scritte a mano in punti
 * diversi del codice (es. "workspace_created" da una parte e
 * "workspace_provisioned" dall'altra).
 *
 * Deliberatamente NON un enum TypeScript né un enum Prisma — `stepKey`
 * resta una colonna `String` semplice nel database (schema.prisma) e
 * l'aggregate ConversationSession continua a lavorare con una stringa
 * generica (vedi domain/conversation-session.entity.ts): non conosce
 * questo registro, non lo importa, resta agnostico rispetto al
 * significato dei singoli passi. Questo oggetto è una comodità per chi
 * SCRIVE i casi d'uso applicativi, non un vincolo imposto al dominio.
 *
 * Aggiungere un passo futuro (import, inizializzazione AI, Business
 * Brain...) significa aggiungere una riga qui — zero migration, zero
 * modifica allo schema.
 *
 * Confinato a questo servizio (onboarding-service), non un package
 * condiviso: nessun altro bounded context ne ha oggi un bisogno reale.
 * Se emergerà, la scelta di estrarlo va rivalutata allora, non
 * anticipata ora.
 */
export const ConversationSteps = {
  LEGAL_CONSENT_GIVEN: 'legal_consent_given',
  ORGANIZATION_CREATED: 'organization_created',
  ROLES_PROVISIONED: 'roles_provisioned',
  WORKSPACE_CREATED: 'workspace_created',
} as const;

export type ConversationStepKey = (typeof ConversationSteps)[keyof typeof ConversationSteps];
