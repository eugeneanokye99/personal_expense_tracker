import { AppError } from '../../middleware/errorHandler';
import type { CreateExpenseDto, ExpenseFilters, UpdateExpenseDto } from '../../../../../packages/shared/types';

export class ExpensesRepository {
  static async list(client: any, userId: string, filters: ExpenseFilters) {
    let query = client
      .from('expenses')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order(filters.sortBy ?? 'date', { ascending: filters.sortDir === 'asc' });

    if (filters.category) query = query.eq('category', filters.category);
    if (filters.source) query = query.eq('source', filters.source);
    if (filters.from) query = query.gte('date', filters.from);
    if (filters.to) query = query.lte('date', filters.to);
    if (filters.amountMin) query = query.gte('amount', filters.amountMin);
    if (filters.amountMax) query = query.lte('amount', filters.amountMax);
    if (filters.search) query = query.ilike('merchant', `%${filters.search}%`);

    const from = ((filters.page ?? 1) - 1) * (filters.limit ?? 20);
    const to = from + (filters.limit ?? 20) - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw new AppError(error.message, 500);
    return { items: data ?? [], total: count ?? 0, page: filters.page ?? 1, limit: filters.limit ?? 20 };
  }

  static async findById(client: any, id: string) {
    const { data, error } = await client.from('expenses').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw new AppError(error.message, 500);
    return data;
  }

  static async create(client: any, userId: string, dto: CreateExpenseDto) {
    const { data, error } = await client
      .from('expenses')
      .insert({
        user_id: userId,
        amount: dto.amount,
        category: dto.category,
        merchant: dto.merchant,
        description: dto.description,
        note: dto.note,
        date: dto.date ?? new Date().toISOString(),
        source: dto.source,
        transaction_type: dto.transactionType ?? 'debit',
        channel: dto.channel,
        email_message_id: dto.emailMessageId,
      })
      .select()
      .single();
    if (error) throw new AppError(error.message, 500);
    return data;
  }

  static async update(client: any, id: string, dto: UpdateExpenseDto) {
    const { data, error } = await client
      .from('expenses')
      .update(dto)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new AppError(error.message, 500);
    return data;
  }

  static async delete(client: any, id: string): Promise<void> {
    const { error } = await client.from('expenses').delete().eq('id', id);
    if (error) throw new AppError(error.message, 500);
  }

  static async getDistinctMerchants(client: any, userId: string): Promise<string[]> {
    const { data, error } = await client
      .from('expenses')
      .select('merchant')
      .eq('user_id', userId)
      .order('merchant');
    if (error) throw new AppError(error.message, 500);
    return [...new Set((data ?? []).map((r: any) => r.merchant))] as string[];
  }

  static async getSummary(client: any, userId: string, opts: { from?: string; to?: string }) {
    let query = client
      .from('expenses')
      .select('amount, category, transaction_type')
      .eq('user_id', userId);
    if (opts.from) query = query.gte('date', opts.from);
    if (opts.to) query = query.lte('date', opts.to);
    const { data, error } = await query;
    if (error) throw new AppError(error.message, 500);
    const totalSpent = (data ?? []).filter((e: any) => e.transaction_type === 'debit').reduce((s: number, e: any) => s + e.amount, 0);
    const totalIncome = (data ?? []).filter((e: any) => e.transaction_type === 'credit').reduce((s: number, e: any) => s + e.amount, 0);
    const byCategory = (data ?? []).reduce((acc: Record<string, number>, e: any) => {
      if (e.transaction_type === 'debit') acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      return acc;
    }, {});
    return { totalSpent, totalIncome, byCategory, transactionCount: (data ?? []).length };
  }

  static async checkExistsByHashOrMetadata(
    client: any,
    userId: string,
    txHash: string,
    date: string,
    amount: number,
    merchant: string
  ): Promise<boolean> {
    const { data, error } = await client
      .from('expenses')
      .select('id')
      .eq('user_id', userId)
      .or(`email_message_id.eq.statement_${txHash},and(amount.eq.${amount},merchant.eq.${merchant},date.eq.${date})`)
      .limit(1);

    if (error) throw new AppError(error.message, 500);
    return data && data.length > 0;
  }

  static async createPendingTransaction(client: any, userId: string, tx: any) {
    const { data, error } = await client
      .from('pending_email_transactions')
      .upsert({
        user_id: userId,
        parsed_amount: tx.parsedAmount,
        merchant: tx.merchant,
        suggested_category: tx.suggestedCategory,
        transaction_type: tx.transactionType ?? 'debit',
        channel: tx.channel,
        confidence: tx.confidence,
        gmail_message_id: tx.gmailMessageId,
        status: tx.status ?? 'pending',
      }, { onConflict: 'user_id,gmail_message_id' })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    return data;
  }
}
