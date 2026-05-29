import { supabase } from '../../config/database';
import { sendSms } from '../../config/arkesel';
import { AppError } from '../../middleware/errorHandler';
import type { NotificationMessage } from '../../../../../packages/shared/types';

export class NotificationsService {
  static async list(userId: string) {
    const { data, error } = await supabase
      .from('notification_history')
      .select('*')
      .eq('user_id', userId)
      .order('fired_at', { ascending: false })
      .limit(50);
    if (error) throw new AppError(error.message, 500);
    return data ?? [];
  }

  static async unreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notification_history')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .is('read_at', null);
    if (error) throw new AppError(error.message, 500);
    return count ?? 0;
  }

  static async markRead(userId: string, id: string): Promise<void> {
    await supabase.from('notification_history').update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId);
  }

  static async dismiss(userId: string, id: string): Promise<void> {
    await supabase.from('notification_history').update({ dismissed: true }).eq('id', id).eq('user_id', userId);
  }

  // Called by notificationDispatch.worker.ts
  static async dispatch(userId: string, msg: NotificationMessage): Promise<void> {
    // 1. Save to notification_history
    await supabase.from('notification_history').insert({
      user_id: userId,
      type: msg.type,
      trigger: msg.trigger,
      message: msg.payload.body,
    });

    // 2. Fetch user preferences
    const { data: user } = await supabase
      .from('users')
      .select('alert_frequency, phone_number, email')
      .eq('id', userId)
      .single();

    if (!user || user.alert_frequency === 'off') return;
    if (user.alert_frequency === 'budget' && msg.type !== 'transactional') return;

    // 3. Send SMS via Arkesel if phone number is set
    if (user.phone_number) {
      const smsBody = `${msg.payload.title}: ${msg.payload.body}`;
      await sendSms(user.phone_number, smsBody).catch(err =>
        console.error('Arkesel SMS failed:', err)
      );
    }

    // 4. TODO: Send email notification via nodemailer/SendGrid
    // TODO: Send browser push notification via web-push
  }
}
