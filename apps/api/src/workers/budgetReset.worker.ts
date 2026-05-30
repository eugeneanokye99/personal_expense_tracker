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
  const todayDate = date ? new Date(date) : new Date();
  const todayDay = todayDate.getDate();

  console.log(`📅 Budget reset check for date: ${todayDate.toISOString().split('T')[0]}`);

  // Fetch all budgets with reset_interval
  const { data: budgets, error } = await supabase
    .from('budgets')
    .select('id, user_id, category, limit_amount, last_reset_at, reset_day, reset_interval');

  if (error) {
    console.error('Failed to fetch budgets for reset:', error);
    return;
  }

  if (!budgets || budgets.length === 0) {
    console.log('No budgets found in database');
    return;
  }

  const toReset = [];
  for (const budget of budgets) {
    const lastReset = budget.last_reset_at ? new Date(budget.last_reset_at) : new Date();
    // Calculate difference in days
    const diffTime = todayDate.getTime() - lastReset.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    const interval = budget.reset_interval || 'monthly';
    let shouldReset = false;

    switch (interval) {
      case 'weekly':
        // Reset if at least 7 days have elapsed since last reset
        shouldReset = diffDays >= 7;
        break;
      case 'monthly': {
        // Reset if we are on the reset_day and it hasn't been reset in this calendar month cycle
        const isSameDay = todayDay === budget.reset_day;
        const differentMonth = lastReset.getMonth() !== todayDate.getMonth() || lastReset.getFullYear() !== todayDate.getFullYear();
        shouldReset = isSameDay && (diffDays >= 20 || differentMonth);
        break;
      }
      case 'quarterly':
        // Reset if at least 90 days have elapsed since last reset
        shouldReset = diffDays >= 90;
        break;
      case 'yearly':
        // Reset if at least 365 days have elapsed since last reset
        shouldReset = diffDays >= 365;
        break;
      default:
        shouldReset = false;
    }

    if (shouldReset) {
      toReset.push(budget);
    }
  }

  if (toReset.length === 0) {
    console.log('No budgets met reset criteria today');
    return;
  }

  let resetCount = 0;
  for (const budget of toReset) {
    try {
      await BudgetsService.resetBudget(supabase, budget.id);
      resetCount++;
    } catch (err) {
      console.error(`Failed to reset budget ${budget.id}:`, err);
    }
  }

  console.log(`✅ Reset ${resetCount}/${toReset.length} budgets matching intervals`);
}
