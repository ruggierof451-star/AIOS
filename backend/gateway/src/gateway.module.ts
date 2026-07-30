import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { HealthController } from './health.controller';
import { CorrelationIdMiddleware } from './correlation-id.middleware';
import { RequestLoggingMiddleware } from './request-logging.middleware';

@Module({
  imports: [
    // Rate limiting (Infrastructure Modulo 4, sezione 15.4 / API Contract
    // sezione 11.2): limite di default per IP — coerente con "limiti
    // differenziati per piano" descritto in architettura, qui semplificato
    // a un limite unico per questa milestone (limite dichiarato: la
    // differenziazione per piano di abbonamento non è ancora cablata,
    // richiederebbe risolvere l'Organization del chiamante prima del
    // rate limiting stesso).
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }]),
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class GatewayModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware, RequestLoggingMiddleware).forRoutes('*');
  }
}
