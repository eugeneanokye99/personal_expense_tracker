import amqplib, { Channel, Connection } from 'amqplib';
import { env } from './env';

let connection: Connection | null = null;
let channel: Channel | null = null;

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

async function getChannel(): Promise<Channel> {
  if (channel) return channel;

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
        'x-message-ttl': 60000, // 60s max message age in queue
      },
    });
  }

  connection.on('close', () => {
    console.warn('⚠️  RabbitMQ connection closed. Reconnecting...');
    channel = null;
    connection = null;
  });

  connection.on('error', (err) => console.error('❌ RabbitMQ error:', err.message));
  console.log('✅ RabbitMQ connected');

  return channel;
}

export async function publishToQueue(queueName: string, message: object): Promise<void> {
  const ch = await getChannel();
  const buffer = Buffer.from(JSON.stringify(message));
  ch.sendToQueue(queueName, buffer, {
    persistent: true,
    contentType: 'application/json',
  });
}

export async function consumeQueue(
  queueName: string,
  handler: (msg: object) => Promise<void>,
): Promise<void> {
  const ch = await getChannel();
  await ch.prefetch(1); // Process one message at a time per worker

  ch.consume(queueName, async (raw) => {
    if (!raw) return;
    try {
      const message = JSON.parse(raw.content.toString());
      await handler(message);
      ch.ack(raw);
    } catch (err) {
      console.error(`Failed to process message from ${queueName}:`, err);
      // Nack without requeue — goes to dead letter queue after max retries
      ch.nack(raw, false, false);
    }
  });

  console.log(`👂 Worker listening on queue: ${queueName}`);
}

export async function closeConnection(): Promise<void> {
  await channel?.close();
  await connection?.close();
  channel = null;
  connection = null;
}
