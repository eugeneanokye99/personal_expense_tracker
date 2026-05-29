import { Request, Response, NextFunction } from 'express';
import { ExpensesService } from './expenses.service';
import { AppError } from '../../middleware/errorHandler';

export class ExpensesController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = '1', limit = '20', category, source, from, to, amountMin, amountMax, search, sortBy = 'date', sortDir = 'desc' } = req.query as Record<string, string>;
      const result = await ExpensesService.list(req.user!.id, {
        page: parseInt(page), limit: parseInt(limit),
        category, source: source as 'manual' | 'email' | undefined,
        from, to, amountMin: amountMin ? parseFloat(amountMin) : undefined,
        amountMax: amountMax ? parseFloat(amountMax) : undefined,
        search, sortBy, sortDir: sortDir as 'asc' | 'desc',
      });
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { amount, category, merchant, note, date, transactionType, source, channel } = req.body;
      if (!amount || !category || !merchant) throw new AppError('amount, category, merchant are required', 400);
      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) throw new AppError('Amount must be a positive number', 400);
      const expense = await ExpensesService.create(req.user!.id, { amount: parseFloat(amount), category, merchant, note, date, transactionType, source, channel });
      res.status(201).json({ success: true, data: expense });
    } catch (err) { next(err); }
  }

  static async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await ExpensesService.getOne(req.user!.id, req.params.id);
      res.json({ success: true, data: expense });
    } catch (err) { next(err); }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const allowed = ['category', 'merchant', 'note', 'amount', 'date', 'transactionType'];
      const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
      const expense = await ExpensesService.update(req.user!.id, req.params.id, updates);
      res.json({ success: true, data: expense });
    } catch (err) { next(err); }
  }

  static async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ExpensesService.remove(req.user!.id, req.params.id);
      res.json({ success: true, message: 'Expense deleted' });
    } catch (err) { next(err); }
  }

  static async getMerchants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchants = await ExpensesService.getDistinctMerchants(req.user!.id);
      res.json({ success: true, data: merchants });
    } catch (err) { next(err); }
  }

  static async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { from, to } = req.query as Record<string, string>;
      const csv = await ExpensesService.exportCsv(req.user!.id, { from, to });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=spendwisely-expenses.csv');
      res.send(csv);
    } catch (err) { next(err); }
  }

  static async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { from, to } = req.query as Record<string, string>;
      const summary = await ExpensesService.getSummary(req.user!.id, { from, to });
      res.json({ success: true, data: summary });
    } catch (err) { next(err); }
  }
}
