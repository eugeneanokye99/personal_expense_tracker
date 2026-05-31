/**
 * SpendWisely Worker Process
 * Runs separately from the API server (separate PM2 process / Docker container)
 * Consumes all RabbitMQ queues.
 */
import { consumeQueue, QUEUES } from '../config/rabbitmq';
import { emailPollerWorker } from './emailPoller.worker';
import { emailParserWorker } from './emailParser.worker';
import { patternCheckWorker } from './patternCheck.worker';
import { notificationDispatchWorker } from './notificationDispatch.worker';
import { budgetResetWorker } from './budgetReset.worker';

async function startWorkers(): Promise<void> {
  console.log('🔧 Starting SpendWisely worker process...');

  await Promise.all([
    consumeQueue(QUEUES.EMAIL_POLL, emailPollerWorker),
    consumeQueue(QUEUES.EMAIL_PARSE, emailParserWorker),
    consumeQueue(QUEUES.PATTERN_CHECK, patternCheckWorker),
    consumeQueue(QUEUES.NOTIFICATION, notificationDispatchWorker),
    consumeQueue(QUEUES.BUDGET_RESET, budgetResetWorker),
  ]);

  console.log('✅ All workers registered and listening');
}

startWorkers().catch((err) => {
  console.error('❌ Worker startup failed:', err);
  throw err;
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Worker process shutting down...');
  process.exit(0);
});
