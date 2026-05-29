import { Request, Response, NextFunction } from 'express';
import { BudgetsService } from './budgets.service';
import { AppError } from '../../middleware/errorHandler';

export class BudgetsController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const budgets = await BudgetsService.listWithSpent(req.user!.id);
      res.json({ success: true, data: budgets });
    } catch (err) { next(err); }
  }

  static async upsert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category, limitAmount, resetDay } = req.body;
      if (!category || !limitAmount) throw new AppError('category and limitAmount are required', 400);
      if (parseFloat(limitAmount) <= 0) throw new AppError('limitAmount must be positive', 400);
      const budget = await BudgetsService.upsert(req.user!.id, { category, limitAmount: parseFloat(limitAmount), resetDay: resetDay ? parseInt(resetDay) : undefined });
      res.status(200).json({ success: true, data: budget });
    } catch (err) { next(err); }
  }

  static async overview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await BudgetsService.getOverview(req.user!.id);
      res.json({ success: true, data: overview });
    } catch (err) { next(err); }
  }

  static async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await BudgetsService.remove(req.user!.id, req.params.id);
      res.json({ success: true, message: 'Budget removed' });
    } catch (err) { next(err); }
  }
}
