export { PermissionEvaluator } from './permission-evaluator';
export type { PermissionGrant, AuthorizationContext } from './permission-evaluator';

export { RequirePermission, REQUIRED_PERMISSION_KEY } from './require-permission.decorator';
export { PermissionGuard } from './permission.guard';
export type { AuthenticatedRequestUser } from './permission.guard';

export {
  AuditLogInterceptor,
  AuditAction,
  AUDIT_ACTION_KEY,
  AUDIT_LOG_WRITER,
  ConsoleAuditLogWriter,
} from './audit-log.interceptor';
export type { AuditLogWriter } from './audit-log.interceptor';

export { JwtVerifier, InvalidAccessTokenError } from './middleware/jwt-verifier';
export type { VerifiedAccessTokenClaims } from './middleware/jwt-verifier';
export { HttpGrantsResolver, GRANTS_RESOLVER } from './middleware/grants-resolver';
export type { GrantsResolver } from './middleware/grants-resolver';
export { AuthMiddleware } from './middleware/auth.middleware';

export { ServiceTokenIssuer, ServiceTokenVerifier, InvalidServiceTokenError } from './service-auth/service-token';
export type { ServiceTokenClaims } from './service-auth/service-token';
export { AllowServices, ALLOWED_SERVICES_KEY } from './service-auth/allow-services.decorator';
export { ServiceAuthGuard } from './service-auth/service-auth.guard';
