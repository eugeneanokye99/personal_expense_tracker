import { runPatternChecks } from '../engine/notificationEngine';
import { publishToQueue, QUEUES } from '../config/rabbitmq';
import type { PatternCheckMessage } from '../../../../packages/shared/types';

/**
 * Runs all behavioral pattern checks after an expense is saved.
 * Queues any triggered notifications to the notification queue.
 */
export async function patternCheckWorker(msg: object): Promise<void> {
  const { userId, category, merchant, amount, date } = msg as PatternCheckMessage;

  const notifications = await runPatternChecks(userId, { category, merchant, amount, date });

  for (const notification of notifications) {
    await publishToQueue(QUEUES.NOTIFICATION, notification);
  }

  if (notifications.length > 0) {
    console.log(`🔔 Pattern check: ${notifications.length} alert(s) queued for user ${userId}`);
  }
}
