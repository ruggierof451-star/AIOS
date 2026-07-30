import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

/**
 * Genera (o propaga se già presente) un correlation_id per ogni richiesta
 * in ingresso al Gateway — l'unico punto in cui questo ID nasce per una
 * richiesta esterna (API Contract, sezione 1.4). Ogni servizio a valle lo
 * riceve già pronto tramite l'header e lo propaga nei propri log/eventi.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const existing = req.headers['x-correlation-id'] as string | undefined;
    const correlationId = existing ?? `corr_${randomUUID()}`;
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
  }
}
