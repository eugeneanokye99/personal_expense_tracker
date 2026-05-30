import { BudgetsRepository } from './budgets.repository';
import { AppError } from '../../middleware/errorHandler';
import type { UpsertBudgetDto } from '../../../../../packages/shared/types';

export class BudgetsService {
  static async listWithSpent(client: any, userId: string) {
    const budgets = await BudgetsRepository.listByUser(client, userId);
    return budgets.map((b: any) => ({
      id: b.id,
      userId: b.user_id,
      category: b.category,
      limitAmount: Number(b.limit_amount),
      resetDay: b.reset_day,
      resetInterval: b.reset_interval || 'monthly',
      lastResetAt: b.last_reset_at,
      spent: Number(b.spent ?? 0),
      remaining: Math.max(0, Number(b.limit_amount) - Number(b.spent ?? 0)),
      percentage: Number(b.limit_amount) > 0 ? Math.min(100, (Number(b.spent ?? 0) / Number(b.limit_amount)) * 100) : 0,
      status: BudgetsService.getStatus(Number(b.spent ?? 0), Number(b.limit_amount)),
    }));
  }

  static async upsert(client: any, userId: string, dto: UpsertBudgetDto) {
    const user = await BudgetsRepository.getUserResetSettings(client, userId);
    const resetDay = dto.resetDay ?? user?.budget_reset_day ?? 1;
    const resetInterval = dto.resetInterval ?? user?.budget_reset_interval ?? 'monthly';
    const b = await BudgetsRepository.upsert(client, userId, { ...dto, resetDay, resetInterval });
    return {
      id: b.id,
      userId: b.user_id,
      category: b.category,
      limitAmount: Number(b.limit_amount),
      resetDay: b.reset_day,
      resetInterval: b.reset_interval || 'monthly',
      lastResetAt: b.last_reset_at,
    };
  }

  static async getOverview(client: any, userId: string) {
    const budgets = await BudgetsService.listWithSpent(client, userId);
    const totalLimit = budgets.reduce((s: number, b: any) => s + Number(b.limitAmount), 0);
    const totalSpent = budgets.reduce((s: number, b: any) => s + (b.spent ?? 0), 0);
    return {
      totalLimit,
      totalSpent,
      remaining: Math.max(0, totalLimit - totalSpent),
      percentage: totalLimit > 0 ? Math.min(100, (totalSpent / totalLimit) * 100) : 0,
      budgets,
    };
  }

  static async remove(client: any, userId: string, id: string): Promise<void> {
    const budget = await BudgetsRepository.findById(client, id);
    if (!budget) throw new AppError('Budget not found', 404);
    if (budget.user_id !== userId) throw new AppError('Forbidden', 403);
    await BudgetsRepository.delete(client, id);
  }

  static async resetBudget(client: any, budgetId: string): Promise<void> {
    // Called by budgetReset.worker.ts
    // 1. Snapshot current period into budget_history before resetting
    await BudgetsRepository.snapshotAndReset(client, budgetId);
  }

  private static getStatus(spent: number, limit: number): 'good' | 'warning' | 'over' {
    const pct = limit > 0 ? (spent / limit) * 100 : 0;
    if (pct >= 100) return 'over';
    if (pct >= 80) return 'warning';
    return 'good';
  }
}
