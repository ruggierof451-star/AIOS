import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSION_KEY = 'aios:required_permission';

/**
 * Decoratore da applicare a ogni endpoint che richiede un permesso
 * specifico (Domain Model, sezione 7). Uso:
 *
 *   @RequirePermission('crm.customer.create')
 *   @Post()
 *   createCustomer() { ... }
 *
 * Il PermissionGuard legge questo metadato e lo valuta contro i grant
 * dell'utente presenti in `request.user.grants` (popolati a monte, vedi
 * README del pacchetto per lo stato attuale di questa milestone).
 */
export const RequirePermission = (action: string) => SetMetadata(REQUIRED_PERMISSION_KEY, action);
