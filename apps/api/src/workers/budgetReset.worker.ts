import { supabase } from '../config/database';
import { BudgetsService } from '../modules/budgets/budgets.service';
import type { BudgetResetMessage } from '../../../../packages/shared/types';

/**
 * Runs daily at midnight (published by an external cron or Supabase pg_cron).
 * Finds all budgets whose reset_day matches today, snapshots the current period
 * into budget_history, and resets last_reset_at.
 *
 * Historical data is PRESERVED — all expenses remain in the expenses table.
 * The budget_history table records what was spent in each period.
 * The Insights page can query expenses with no date filter to show all-time history.
 */
export async function budgetResetWorker(msg: object): Promise<void> {
  const { date } = msg as BudgetResetMessage;
  const today = new Date(date).getDate();

  console.log(`📅 Budget reset check for day ${today} of the month`);

  // Find all budgets with reset_day === today
  const { data: budgets, error } = await supabase
    .from('budgets')
    .select('id, user_id, category, limit_amount, last_reset_at, reset_day')
    .eq('reset_day', today);

  if (error) {
    console.error('Failed to fetch budgets for reset:', error);
    return;
  }

  if (!budgets || budgets.length === 0) {
    console.log('No budgets to reset today');
    return;
  }

  let resetCount = 0;
  for (const budget of budgets) {
    try {
      await BudgetsService.resetBudget(budget.id);
      resetCount++;
    } catch (err) {
      console.error(`Failed to reset budget ${budget.id}:`, err);
    }
  }

  console.log(`✅ Reset ${resetCount}/${budgets.length} budgets for day ${today}`);
}
