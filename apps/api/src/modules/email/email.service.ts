import { publishToQueue } from '../../config/rabbitmq';
import { AppError } from '../../middleware/errorHandler';
import { ExpensesRepository } from '../expenses/expenses.repository';

export class EmailService {
  static async listAccounts(client: any, userId: string) {
    const { data, error } = await client
      .from('email_accounts')
      .select('id, provider, email_address, last_scanned_at, is_active')
      .eq('user_id', userId);
    if (error) throw new AppError(error.message, 500);
    return data ?? [];
  }

  static async disconnect(client: any, userId: string, accountId: string): Promise<void> {
    const { error } = await client
      .from('email_accounts')
      .update({ is_active: false })
      .eq('id', accountId)
      .eq('user_id', userId);
    if (error) throw new AppError(error.message, 500);
  }

  static async triggerManualScan(client: any, userId: string): Promise<void> {
    const { data: accounts } = await client
      .from('email_accounts')
      .select('id, provider')
      .eq('user_id', userId)
      .eq('is_active', true);

    for (const account of accounts ?? []) {
      await publishToQueue('email.poll.queue', {
        emailAccountId: account.id,
        userId,
        provider: account.provider,
      });
    }
  }

  static async listPending(client: any, userId: string) {
    const { data, error } = await client
      .from('pending_email_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw new AppError(error.message, 500);
    return data ?? [];
  }

  static async confirmPending(client: any, userId: string, pendingId: string, overrides: Record<string, unknown>) {
    const { data: pending } = await client
      .from('pending_email_transactions')
      .select('*')
      .eq('id', pendingId)
      .eq('user_id', userId)
      .single();
    if (!pending) throw new AppError('Pending transaction not found', 404);

    const expense = await ExpensesRepository.create(client, userId, {
      amount: (overrides.amount as number) ?? pending.parsed_amount,
      category: (overrides.category as string) ?? pending.suggested_category,
      merchant: (overrides.merchant as string) ?? pending.merchant,
      source: 'email',
      transactionType: pending.transaction_type,
      channel: pending.channel,
      emailMessageId: pending.gmail_message_id,
    });

    // Save user's category override for this merchant for future auto-categorisation
    if (overrides.category && overrides.category !== pending.suggested_category) {
      await client.from('merchant_category_overrides').upsert({
        user_id: userId,
        merchant: pending.merchant,
        category: overrides.category,
      }, { onConflict: 'user_id,merchant' });
    }

    await client.from('pending_email_transactions').update({ status: 'confirmed' }).eq('id', pendingId);
    return expense;
  }

  static async rejectPending(client: any, userId: string, pendingId: string): Promise<void> {
    await client
      .from('pending_email_transactions')
      .update({ status: 'rejected' })
      .eq('id', pendingId)
      .eq('user_id', userId);
  }
}
