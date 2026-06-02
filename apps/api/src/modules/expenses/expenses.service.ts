import crypto from 'crypto';
import { ExpensesRepository } from './expenses.repository';
import { AppError } from '../../middleware/errorHandler';
import { publishToQueue } from '../../config/rabbitmq';
import { MomoParser } from '../../engine/momoParser';
import type { CreateExpenseDto, ExpenseFilters, UpdateExpenseDto } from '../../../../../packages/shared/types';

export class ExpensesService {
  static async list(client: any, userId: string, filters: ExpenseFilters) {
    return ExpensesRepository.list(client, userId, filters);
  }

  static async create(client: any, userId: string, dto: CreateExpenseDto) {
    const expense = await ExpensesRepository.create(client, userId, dto);

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

  static async getOne(client: any, userId: string, id: string) {
    const expense = await ExpensesRepository.findById(client, id);
    if (!expense) throw new AppError('Expense not found', 404);
    if (expense.user_id !== userId) throw new AppError('Forbidden', 403);
    return expense;
  }

  static async update(client: any, userId: string, id: string, dto: UpdateExpenseDto) {
    await ExpensesService.getOne(client, userId, id);
    return ExpensesRepository.update(client, id, dto);
  }

  static async remove(client: any, userId: string, id: string): Promise<void> {
    await ExpensesService.getOne(client, userId, id);
    await ExpensesRepository.delete(client, id);
  }

  static async getDistinctMerchants(client: any, userId: string): Promise<string[]> {
    return ExpensesRepository.getDistinctMerchants(client, userId);
  }

  static async exportCsv(client: any, userId: string, opts: { from?: string; to?: string }): Promise<string> {
    const expenses = await ExpensesRepository.list(client, userId, {
      page: 1, limit: 10000,
      from: opts.from, to: opts.to,
      sortBy: 'date', sortDir: 'desc',
    });
    const header = 'Date,Merchant,Category,Amount,Type,Channel,Note,Source';
    const rows = expenses.items.map((e: any) =>
      `${e.date},${e.merchant},${e.category},${e.amount},${e.transaction_type},${e.channel ?? ''},"${e.note ?? ''}",${e.source}`
    );
    return [header, ...rows].join('\n');
  }

  static async getSummary(client: any, userId: string, opts: { from?: string; to?: string }) {
    return ExpensesRepository.getSummary(client, userId, opts);
  }

  static async uploadStatement(
    client: any,
    userId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ parsedCount: number; savedCount: number; pendingCount: number; duplicateCount: number }> {
    const parsedTransactions = await MomoParser.parseStatement(fileBuffer, mimeType);

    let savedCount = 0;
    let pendingCount = 0;
    let duplicateCount = 0;

    for (const tx of parsedTransactions) {
      const txHash = crypto
        .createHash('md5')
        .update(`${userId}_${tx.date}_${tx.amount}_${tx.merchant}_${tx.channel}`)
        .digest('hex');

      const isDuplicate = await ExpensesRepository.checkExistsByHashOrMetadata(
        client,
        userId,
        txHash,
        tx.date,
        tx.amount,
        tx.merchant
      );
      if (isDuplicate) {
        duplicateCount++;
        continue;
      }

      if (tx.confidence >= 85) {
        await ExpensesService.create(client, userId, {
          amount: tx.amount,
          category: tx.category,
          merchant: tx.merchant,
          date: tx.date,
          source: 'email', // Route to 'email' (automatic entry) to fit DB constraint
          transactionType: tx.transactionType,
          channel: tx.channel,
          note: tx.reference ? `Reference: ${tx.reference}` : `Uploaded statement transaction: ${tx.merchant} (${tx.channel}) [TxHash: ${txHash.slice(0, 8)}]`,
          description: tx.reference,
        });
        savedCount++;
      } else {
        await ExpensesRepository.createPendingTransaction(client, userId, {
          parsedAmount: tx.amount,
          merchant: tx.merchant,
          suggestedCategory: tx.category,
          transactionType: tx.transactionType,
          channel: tx.channel,
          confidence: tx.confidence,
          gmailMessageId: `statement_${txHash}`, // reuse gmailMessageId for dedup index
          status: 'pending',
        });
        pendingCount++;
      }
    }

    return {
      parsedCount: parsedTransactions.length,
      savedCount,
      pendingCount,
      duplicateCount,
    };
  }
}
