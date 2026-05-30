import { AppError } from '../../middleware/errorHandler';
import type { UpsertBudgetDto } from '../../../../../packages/shared/types';

export class BudgetsRepository {
  static async listByUser(client: any, userId: string) {
    // Join with expenses to compute spent amount since last_reset_at
    const { data, error } = await client.rpc('get_budgets_with_spent', { p_user_id: userId });
    if (error) throw new AppError(error.message, 500);
    return data ?? [];
  }

  static async findById(client: any, id: string) {
    const { data, error } = await client.from('budgets').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw new AppError(error.message, 500);
    return data;
  }

  static async upsert(client: any, userId: string, dto: UpsertBudgetDto & { resetDay: number; resetInterval: string }) {
    const { data, error } = await client
      .from('budgets')
      .upsert({
        user_id: userId,
        category: dto.category,
        limit_amount: dto.limitAmount,
        reset_day: dto.resetDay,
        reset_interval: dto.resetInterval,
      }, { onConflict: 'user_id,category' })
      .select()
      .single();
    if (error) throw new AppError(error.message, 500);
    return data;
  }

  static async delete(client: any, id: string): Promise<void> {
    const { error } = await client.from('budgets').delete().eq('id', id);
    if (error) throw new AppError(error.message, 500);
  }

  static async getUserResetSettings(client: any, userId: string) {
    const { data } = await client.from('users').select('budget_reset_day, budget_reset_interval').eq('id', userId).single();
    return data;
  }

  static async snapshotAndReset(client: any, budgetId: string): Promise<void> {
    // 1. Get current budget
    const budget = await BudgetsRepository.findById(client, budgetId);
    if (!budget) return;

    // 2. Calculate spent in this period
    const { data: expenses } = await client
      .from('expenses')
      .select('amount')
      .eq('user_id', budget.user_id)
      .eq('category', budget.category)
      .eq('transaction_type', 'debit')
      .gte('date', budget.last_reset_at);

    const totalSpent = (expenses ?? []).reduce((s: number, e: { amount: number }) => s + e.amount, 0);

    // 3. Insert into budget_history
    await client.from('budget_history').insert({
      budget_id: budget.id,
      user_id: budget.user_id,
      period_start: budget.last_reset_at,
      period_end: new Date().toISOString(),
      limit_amount: budget.limit_amount,
      total_spent: totalSpent,
    });

    // 4. Reset last_reset_at to now
    await client.from('budgets').update({ last_reset_at: new Date().toISOString() }).eq('id', budgetId);
  }
}
