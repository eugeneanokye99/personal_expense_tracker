import { BudgetsRepository } from './budgets.repository';
import { AppError } from '../../middleware/errorHandler';
import type { UpsertBudgetDto } from '../../../../../packages/shared/types';

export class BudgetsService {
  static async listWithSpent(userId: string) {
    const budgets = await BudgetsRepository.listByUser(userId);
    return budgets.map(b => ({
      ...b,
      spent: b.spent ?? 0,
      remaining: Math.max(0, b.limit_amount - (b.spent ?? 0)),
      percentage: b.limit_amount > 0 ? Math.min(100, ((b.spent ?? 0) / b.limit_amount) * 100) : 0,
      status: BudgetsService.getStatus(b.spent ?? 0, b.limit_amount),
    }));
  }

  static async upsert(userId: string, dto: UpsertBudgetDto) {
    const user = await BudgetsRepository.getUserResetDay(userId);
    const resetDay = dto.resetDay ?? user?.budget_reset_day ?? 1;
    return BudgetsRepository.upsert(userId, { ...dto, resetDay });
  }

  static async getOverview(userId: string) {
    const budgets = await BudgetsService.listWithSpent(userId);
    const totalLimit = budgets.reduce((s, b) => s + b.limit_amount, 0);
    const totalSpent = budgets.reduce((s, b) => s + (b.spent ?? 0), 0);
    return {
      totalLimit,
      totalSpent,
      remaining: Math.max(0, totalLimit - totalSpent),
      percentage: totalLimit > 0 ? Math.min(100, (totalSpent / totalLimit) * 100) : 0,
      budgets,
    };
  }

  static async remove(userId: string, id: string): Promise<void> {
    const budget = await BudgetsRepository.findById(id);
    if (!budget) throw new AppError('Budget not found', 404);
    if (budget.user_id !== userId) throw new AppError('Forbidden', 403);
    await BudgetsRepository.delete(id);
  }

  static async resetBudget(budgetId: string): Promise<void> {
    // Called by budgetReset.worker.ts
    // 1. Snapshot current period into budget_history before resetting
    await BudgetsRepository.snapshotAndReset(budgetId);
  }

  private static getStatus(spent: number, limit: number): 'good' | 'warning' | 'over' {
    const pct = limit > 0 ? (spent / limit) * 100 : 0;
    if (pct >= 100) return 'over';
    if (pct >= 80) return 'warning';
    return 'good';
  }
}
