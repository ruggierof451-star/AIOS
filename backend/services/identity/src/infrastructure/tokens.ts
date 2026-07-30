/**
 * Token di iniezione NestJS per dipendenze che non sono classi (stringhe,
 * interfacce) — NestJS richiede un token esplicito in questi casi, non può
 * risolverli per tipo come farebbe con una classe.
 */

export const PRISMA_CLIENT = Symbol('PRISMA_CLIENT');
export const JWT_SECRET = Symbol('JWT_SECRET');
export const MFA_SECRET_PROVIDER = Symbol('MFA_SECRET_PROVIDER');
