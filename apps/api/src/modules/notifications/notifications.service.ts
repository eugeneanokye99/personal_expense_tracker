import { supabase } from '../../config/database';
import { sendSms } from '../../config/arkesel';
import { publishToQueue } from '../../config/rabbitmq';
import { sendMail } from '../../config/mailer';
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

    // 4. Send email notification via nodemailer
    if (user.email) {
      await sendMail(
        user.email,
        msg.payload.title,
        msg.payload.body
      ).catch(err => console.error('Nodemailer email dispatch failed:', err.message));
    }
  }

  static async sendDailyReminders(): Promise<{ sentCount: number }> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Fetch active users (where alert_frequency != 'off')
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, display_name, notification_mode, phone_number')
      .neq('alert_frequency', 'off');

    if (userError) throw new AppError(userError.message, 500);
    if (!users || users.length === 0) return { sentCount: 0 };

    let sentCount = 0;

    for (const user of users) {
      // Check if user has logged any transaction today
      const { count, error: countError } = await supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('date', todayStart.toISOString());

      if (countError) {
        console.error(`Failed to check transaction count for user ${user.id}:`, countError.message);
        continue;
      }

      // If user has 0 transactions today, trigger daily reminder nudge
      if (!count || count === 0) {
        const isFunny = user.notification_mode === 'funny';
        const title = isFunny ? 'Quiet day? 👀' : 'Daily Spend Nudge';
        const body = isFunny
          ? `Hey ${user.display_name}, quiet day? Or are you just hiding your transactions from me? 🤐 Don't forget to log your manual spends before you sleep!`
          : `Hello ${user.display_name}, please record your manual expenses for today to keep your SpendWisely budget tracking accurate.`;

        await publishToQueue('notification.queue', {
          userId: user.id,
          type: isFunny ? 'funny' : 'transactional',
          trigger: 'daily_nudge',
          payload: { title, body },
        }).catch(err => console.error(`Failed to publish daily reminder for user ${user.id}:`, err));

        sentCount++;
      }
    }

    return { sentCount };
  }
}
