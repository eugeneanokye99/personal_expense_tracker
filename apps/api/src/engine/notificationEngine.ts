import { subDays, startOfMonth, isWeekend, getHours, differenceInCalendarWeeks } from 'date-fns';
import { redis } from '../config/redis';
import { supabase } from '../config/database';
import { ALERT_COPY } from './alertCopy';
import type { Expense, NotificationMessage } from '../../../../packages/shared/types';

const RIDE_MERCHANTS = ['bolt', 'uber', 'yango', 'indrive', 'lyft'];

export async function runPatternChecks(
  userId: string,
  newExpense: { category: string; merchant: string; amount: number; date: string },
): Promise<NotificationMessage[]> {
  const results: NotificationMessage[] = [];

  const gateKey = `notif:funny:gate:${userId}`;
  const gateActive = await redis.exists(gateKey);

  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
  const { data: recent } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .gte('date', thirtyDaysAgo)
    .order('date', { ascending: false });

  const recentExpenses: Expense[] = recent ?? [];

  if (!gateActive) {
    const checks = [
      checkRepeatMerchant(userId, newExpense, recentExpenses),
      checkHighRideCount(userId, recentExpenses),
      checkBigSingleSpend(userId, newExpense),
      checkWeekendSplurge(userId, newExpense, recentExpenses),
      checkNightSpending(userId, newExpense, recentExpenses),
      checkConsistentMerchant(userId, newExpense, recentExpenses),
      checkMonthlyIncrease(userId, newExpense, recentExpenses),
    ];
    const checkResults = await Promise.all(checks);
    for (const r of checkResults) if (r) results.push(r);
  }

  // Budget checks are never gated
  const budgetAlert = await checkBudgetThreshold(userId, newExpense);
  if (budgetAlert) results.push(budgetAlert);

  // Set 24h gate if any funny alert fired
  if (results.some(r => r.type === 'funny')) {
    await redis.set(gateKey, '1', 'EX', 86400);
  }

  return results;
}

function buildNotification(
  userId: string,
  type: 'transactional' | 'funny' | 'encouraging',
  trigger: string,
  mode: 'funny' | 'serious',
  data: Record<string, unknown>,
): NotificationMessage {
  const copy = ALERT_COPY[trigger];
  const { title, body } = copy[mode](data);
  return { userId, type, trigger, payload: { title, body } };
}

async function getUserMode(userId: string): Promise<'funny' | 'serious'> {
  const { data } = await supabase.from('users').select('notification_mode').eq('id', userId).single();
  return (data?.notification_mode ?? 'funny') as 'funny' | 'serious';
}

async function checkRepeatMerchant(userId: string, newExpense: { merchant: string }, recent: Expense[]): Promise<NotificationMessage | null> {
  const sevenDaysAgo = subDays(new Date(), 7);
  const count = recent.filter(e => e.merchant === newExpense.merchant && new Date(e.date) >= sevenDaysAgo).length;
  if (count < 3) return null;
  const mode = await getUserMode(userId);
  return buildNotification(userId, 'funny', 'repeat_merchant', mode, { merchant: newExpense.merchant, count });
}

async function checkHighRideCount(userId: string, recent: Expense[]): Promise<NotificationMessage | null> {
  const start = startOfMonth(new Date());
  const count = recent.filter(e => RIDE_MERCHANTS.some(m => e.merchant.toLowerCase().includes(m)) && new Date(e.date) >= start).length;
  if (count < 10) return null;
  const mode = await getUserMode(userId);
  return buildNotification(userId, 'funny', 'high_ride_count', mode, { count });
}

async function checkBigSingleSpend(userId: string, newExpense: { amount: number; category: string }): Promise<NotificationMessage | null> {
  const { data: budget } = await supabase.from('budgets').select('limit_amount').eq('user_id', userId).eq('category', newExpense.category).single();
  if (!budget) return null;
  if (newExpense.amount < budget.limit_amount * 0.5) return null;
  const mode = await getUserMode(userId);
  return buildNotification(userId, 'funny', 'big_single_spend', mode, { amount: newExpense.amount, category: newExpense.category });
}

async function checkWeekendSplurge(userId: string, newExpense: { date: string }, recent: Expense[]): Promise<NotificationMessage | null> {
  if (!isWeekend(new Date(newExpense.date))) return null;
  const weekendTotal = recent.filter(e => isWeekend(new Date(e.date))).reduce((s, e) => s + e.amount, 0);
  const weekdayTotal = recent.filter(e => !isWeekend(new Date(e.date))).reduce((s, e) => s + e.amount, 0);
  const weekendAvg = weekendTotal / Math.max(1, recent.filter(e => isWeekend(new Date(e.date))).length);
  const weekdayAvg = weekdayTotal / Math.max(1, recent.filter(e => !isWeekend(new Date(e.date))).length);
  if (weekendAvg < weekdayAvg * 3) return null;
  const mode = await getUserMode(userId);
  return buildNotification(userId, 'funny', 'weekend_splurge', mode, {});
}

async function checkNightSpending(userId: string, newExpense: { date: string }, recent: Expense[]): Promise<NotificationMessage | null> {
  if (getHours(new Date(newExpense.date)) < 22) return null;
  const sevenDaysAgo = subDays(new Date(), 7);
  const lateNightCount = recent.filter(e => getHours(new Date(e.date)) >= 22 && new Date(e.date) >= sevenDaysAgo).length;
  if (lateNightCount < 3) return null;
  const mode = await getUserMode(userId);
  return buildNotification(userId, 'funny', 'night_spending', mode, {});
}

async function checkConsistentMerchant(userId: string, newExpense: { merchant: string }, recent: Expense[]): Promise<NotificationMessage | null> {
  const now = new Date();
  const weeksWithMerchant = new Set(
    recent.filter(e => e.merchant === newExpense.merchant).map(e => differenceInCalendarWeeks(now, new Date(e.date)))
  );
  if (weeksWithMerchant.size < 4) return null;
  const mode = await getUserMode(userId);
  return buildNotification(userId, 'funny', 'consistent_merchant', mode, { merchant: newExpense.merchant });
}

async function checkMonthlyIncrease(userId: string, newExpense: { category: string }, recent: Expense[]): Promise<NotificationMessage | null> {
  const thisMonthStart = startOfMonth(new Date());
  const lastMonthStart = startOfMonth(subDays(thisMonthStart, 1));
  const thisMonth = recent.filter(e => new Date(e.date) >= thisMonthStart && e.category === newExpense.category).reduce((s, e) => s + e.amount, 0);
  const lastMonth = recent.filter(e => new Date(e.date) >= lastMonthStart && new Date(e.date) < thisMonthStart && e.category === newExpense.category).reduce((s, e) => s + e.amount, 0);
  if (lastMonth === 0 || thisMonth < lastMonth * 1.4) return null;
  const pct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  const mode = await getUserMode(userId);
  return buildNotification(userId, 'funny', 'monthly_increase', mode, { category: newExpense.category, pct });
}

async function checkBudgetThreshold(userId: string, newExpense: { category: string; amount: number }): Promise<NotificationMessage | null> {
  const { data: budget } = await supabase
    .from('budgets')
    .select('limit_amount, last_reset_at')
    .eq('user_id', userId)
    .eq('category', newExpense.category)
    .single();
  if (!budget) return null;

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount')
    .eq('user_id', userId)
    .eq('category', newExpense.category)
    .eq('transaction_type', 'debit')
    .gte('date', budget.last_reset_at);

  const spent = (expenses ?? []).reduce((s: number, e: { amount: number }) => s + e.amount, 0);
  const pct = budget.limit_amount > 0 ? (spent / budget.limit_amount) * 100 : 0;
  const mode = await getUserMode(userId);

  if (pct >= 100) {
    return buildNotification(userId, 'transactional', 'budget_over', mode, { category: newExpense.category, spent, limit: budget.limit_amount });
  }
  if (pct >= 80) {
    return buildNotification(userId, 'transactional', 'budget_warning', mode, { category: newExpense.category, pct: Math.round(pct) });
  }
  return null;
}
