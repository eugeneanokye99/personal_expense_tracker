import { ExpensesRepository } from './expenses.repository';
import { AppError } from '../../middleware/errorHandler';
import { publishToQueue } from '../../config/rabbitmq';
import type { CreateExpenseDto, ExpenseFilters, UpdateExpenseDto } from '../../../../../packages/shared/types';

export class ExpensesService {
  static async list(userId: string, filters: ExpenseFilters) {
    return ExpensesRepository.list(userId, filters);
  }

  static async create(userId: string, dto: CreateExpenseDto) {
    const expense = await ExpensesRepository.create(userId, dto);

    // Trigger async pattern check and notification engine
    await publishToQueue('pattern.check.queue', {
      userId,
      expenseId: expense.id,
      category: expense.category,
      merchant: expense.merchant,
      amount: expense.amount,
      date: expense.date,
    }).catch(err => console.error('Failed to publish pattern check:', err));

    return expense;
  }

  static async getOne(userId: string, id: string) {
    const expense = await ExpensesRepository.findById(id);
    if (!expense) throw new AppError('Expense not found', 404);
    if (expense.user_id !== userId) throw new AppError('Forbidden', 403);
    return expense;
  }

  static async update(userId: string, id: string, dto: UpdateExpenseDto) {
    await ExpensesService.getOne(userId, id);
    return ExpensesRepository.update(id, dto);
  }

  static async remove(userId: string, id: string): Promise<void> {
    await ExpensesService.getOne(userId, id);
    await ExpensesRepository.delete(id);
  }

  static async getDistinctMerchants(userId: string): Promise<string[]> {
    return ExpensesRepository.getDistinctMerchants(userId);
  }

  static async exportCsv(userId: string, opts: { from?: string; to?: string }): Promise<string> {
    const expenses = await ExpensesRepository.list(userId, {
      page: 1, limit: 10000,
      from: opts.from, to: opts.to,
      sortBy: 'date', sortDir: 'desc',
    });
    const header = 'Date,Merchant,Category,Amount,Type,Channel,Note,Source';
    const rows = expenses.items.map(e =>
      `${e.date},${e.merchant},${e.category},${e.amount},${e.transaction_type},${e.channel ?? ''},"${e.note ?? ''}",${e.source}`
    );
    return [header, ...rows].join('\n');
  }

  static async getSummary(userId: string, opts: { from?: string; to?: string }) {
    return ExpensesRepository.getSummary(userId, opts);
  }
}
