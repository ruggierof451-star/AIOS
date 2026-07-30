import { SetMetadata } from '@nestjs/common';

export const ALLOWED_SERVICES_KEY = 'aios:allowed_services';

/**
 * Decoratore da applicare a ogni endpoint interno, non pensato per
 * essere pubblico, raggiungibile solo dai servizi elencati (Feature 2.1
 * — autenticazione service-to-service). Rispecchia esattamente il
 * pattern già in uso per @RequirePermission — stesso meccanismo di
 * riflessione, nessun pattern nuovo introdotto.
 *
 *   @AllowServices('organization-service', 'onboarding-service')
 *   @Post('organizations/:id/default-roles')
 *   createDefaultRoles() { ... }
 */
export const AllowServices = (...serviceNames: string[]) => SetMetadata(ALLOWED_SERVICES_KEY, serviceNames);
