import { NotificationsService } from '../modules/notifications/notifications.service';
import type { NotificationMessage } from '../../../../packages/shared/types';

/**
 * Receives a notification message and dispatches it via all configured channels:
 * - Persists to notification_history (always)
 * - SMS via Arkesel (if phone number set and alertFrequency allows)
 * - Email (TODO: nodemailer / SendGrid)
 * - Browser Push (TODO: web-push)
 */
export async function notificationDispatchWorker(msg: object): Promise<void> {
  const notification = msg as NotificationMessage;
  await NotificationsService.dispatch(notification.userId, notification);
  console.log(`📬 Dispatched [${notification.type}] alert "${notification.trigger}" to user ${notification.userId}`);
}
