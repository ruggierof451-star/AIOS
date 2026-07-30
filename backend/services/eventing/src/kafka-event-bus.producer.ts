import { Kafka, Producer } from 'kafkajs';
import { EventBusProducer, OutboxEventRow } from './outbox-relay.logic';

export class KafkaEventBusProducer implements EventBusProducer {
  private producer: Producer;
  private connected = false;

  constructor(brokers: string[]) {
    const kafka = new Kafka({ clientId: 'aios-outbox-relay', brokers });
    this.producer = kafka.producer();
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.producer.connect();
      this.connected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.producer.disconnect();
      this.connected = false;
    }
  }

  async send(topic: string, event: OutboxEventRow): Promise<void> {
    await this.connect();
    await this.producer.send({
      topic,
      messages: [
        {
          // Chiave = aggregateId: garantisce l'ordine per la stessa entità
          // all'interno della stessa partizione (Infrastructure Modulo 4,
          // sezione 6.2).
          key: event.aggregateId,
          value: JSON.stringify({
            event_id: event.id,
            event_type: event.eventType,
            event_version: event.eventVersion,
            aggregate_id: event.aggregateId,
            organization_id: event.organizationId,
            correlation_id: event.correlationId,
            produced_at: event.createdAt.toISOString(),
            payload: event.payload,
          }),
        },
      ],
    });
  }
}
