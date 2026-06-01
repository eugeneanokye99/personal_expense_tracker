import amqplib, { Channel } from 'amqplib';
import { env } from './env';
import EventEmitter from 'events';

let connection: any = null;
let channel: any = null;
let useMemoryBroker = false;

// Queue names — single source of truth
export const QUEUES = {
  EMAIL_POLL: 'email.poll.queue',
  EMAIL_PARSE: 'email.parse.queue',
  NOTIFICATION: 'notification.queue',
  BUDGET_RESET: 'budget.reset.queue',
  PATTERN_CHECK: 'pattern.check.queue',
} as const;

export const DEAD_LETTER_EXCHANGE = 'spendwisely.dlx';
export const DEAD_LETTER_QUEUE = 'spendwisely.dead.letters';

class InMemoryMessageBroker extends EventEmitter {
  private queueHandlers = new Map<string, ((msg: any) => Promise<void>)[]>();

  async publishToQueue(queueName: string, message: object): Promise<void> {
    const queueListeners = this.queueHandlers.get(queueName) || [];
    for (const listener of queueListeners) {
      setTimeout(async () => {
        try {
          await listener(message);
        } catch (err) {
          console.error(`❌ [In-Memory Broker] Error processing message on ${queueName}:`, err);
        }
      }, 0);
    }
  }

  async consumeQueue(queueName: string, handler: (msg: any) => Promise<void>): Promise<void> {
    const queueListeners = this.queueHandlers.get(queueName) || [];
    queueListeners.push(handler);
    this.queueHandlers.set(queueName, queueListeners);
  }
}

const memoryBroker = new InMemoryMessageBroker();

async function getChannel(): Promise<Channel | null> {
  if (useMemoryBroker) return null;
  if (channel) return channel;

  try {
    connection = await amqplib.connect(env.RABBITMQ_URL);
    channel = await connection.createChannel();

    // Dead letter setup
    await channel.assertExchange(DEAD_LETTER_EXCHANGE, 'direct', { durable: true });
    await channel.assertQueue(DEAD_LETTER_QUEUE, { durable: true });
    await channel.bindQueue(DEAD_LETTER_QUEUE, DEAD_LETTER_EXCHANGE, '');

    // Assert all queues with dead letter routing
    for (const queueName of Object.values(QUEUES)) {
      await channel.assertQueue(queueName, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': DEAD_LETTER_EXCHANGE,
          'x-message-ttl': 60000,
        },
      });
    }

    connection.on('close', () => {
      console.warn('⚠️  RabbitMQ connection closed. Reconnecting...');
      channel = null;
      connection = null;
    });

    connection.on('error', (err: any) => console.error('❌ RabbitMQ error:', err.message));
    console.log('✅ RabbitMQ connected to cloud');

    return channel;
  } catch (err: any) {
    console.warn(`⚠️  Failed to connect to cloud RabbitMQ (${err.message}). Falling back to in-memory message broker...`);
    useMemoryBroker = true;
    channel = null;
    connection = null;
    return null;
  }
}

export async function publishToQueue(queueName: string, message: object): Promise<void> {
  const ch = await getChannel();
  if (useMemoryBroker) {
    await memoryBroker.publishToQueue(queueName, message);
    return;
  }
  const buffer = Buffer.from(JSON.stringify(message));
  ch!.sendToQueue(queueName, buffer, {
    persistent: true,
    contentType: 'application/json',
  });
}

export async function consumeQueue(
  queueName: string,
  handler: (msg: object) => Promise<void>,
): Promise<void> {
  const ch = await getChannel();
  if (useMemoryBroker) {
    await memoryBroker.consumeQueue(queueName, handler);
    return;
  }

  await ch!.prefetch(1); // Process one message at a time per worker

  ch!.consume(queueName, async (raw) => {
    if (!raw) return;
    try {
      const message = JSON.parse(raw.content.toString());
      await handler(message);
      ch!.ack(raw);
    } catch (err) {
      console.error(`Failed to process message from ${queueName}:`, err);
      ch!.nack(raw, false, false);
    }
  });

  console.log(`👂 Worker listening on queue: ${queueName}`);
}

export async function closeConnection(): Promise<void> {
  if (useMemoryBroker) return;
  await channel?.close();
  await connection?.close();
  channel = null;
  connection = null;
}
