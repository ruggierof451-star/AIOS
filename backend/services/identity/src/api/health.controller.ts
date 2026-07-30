import { Controller, Get } from '@nestjs/common';

/**
 * GET /health — liveness check di questo servizio, sempre pubblico
 * (mai dietro AuthMiddleware/PermissionGuard, altrimenti perderebbe
 * senso per strumenti di infrastruttura come Docker healthcheck o un
 * load balancer, che non hanno un JWT da presentare).
 */
@Controller()
export class HealthController {
  @Get('health')
  check() {
    return { status: 'ok', service: 'identity', timestamp: new Date().toISOString() };
  }
}
