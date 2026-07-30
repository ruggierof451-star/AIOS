import { Controller, Get } from '@nestjs/common';

/**
 * `GET /health` — health check del Gateway stesso (Infrastructure
 * Modulo 4, sezione 4.3). Non verifica la salute dei servizi a valle
 * (limite dichiarato: un health check aggregato è un miglioramento
 * naturale futuro, non incluso qui per restare semplice).
 */
@Controller()
export class HealthController {
  @Get('health')
  check() {
    return { status: 'ok', service: 'aios-gateway', timestamp: new Date().toISOString() };
  }
}
