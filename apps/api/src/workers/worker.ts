/**
 * SpendWisely Worker Process
 * Runs separately from the API server (separate PM2 process / Docker container)
 * Consumes all RabbitMQ queues.
 */
import http from 'http';
import { consumeQueue, QUEUES } from '../config/rabbitmq';
import { emailPollerWorker } from './emailPoller.worker';
import { emailParserWorker } from './emailParser.worker';
import { patternCheckWorker } from './patternCheck.worker';
import { notificationDispatchWorker } from './notificationDispatch.worker';
import { budgetResetWorker } from './budgetReset.worker';

// Satisfy Render Web Service port-binding checks on the free tier
const PORT = process.env.PORT || 10000;
const dummyServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', worker: 'SpendWisely Background Worker' }));
});

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

  // Start the dummy HTTP server to bind to Render's port
  dummyServer.listen(PORT, () => {
    console.log(`🤖 Dummy health check server listening on port ${PORT}`);
  });
}

startWorkers().catch((err) => {
  console.error('❌ Worker startup failed:', err);
  throw err;
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Worker process shutting down...');
  dummyServer.close(() => {
    process.exit(0);
  });
});
