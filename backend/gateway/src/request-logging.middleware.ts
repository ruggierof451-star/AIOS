import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

/**
 * Logging strutturato minimo (Infrastructure Modulo 4, sezione 11.1) —
 * ogni riga porta correlation_id, metodo, path, status, latenza. Non
 * ancora inviato a Grafana Loki (limite dichiarato: l'osservabilità
 * centralizzata non è nello scope di questa milestone), solo stdout —
 * sufficiente per lo sviluppo locale.
 */
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const correlationId = req.headers['x-correlation-id'];

    res.on('finish', () => {
      const durationMs = Date.now() - start;
      console.log(
        JSON.stringify({
          correlation_id: correlationId,
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          duration_ms: durationMs,
          timestamp: new Date().toISOString(),
        }),
      );
    });

    next();
  }
}
