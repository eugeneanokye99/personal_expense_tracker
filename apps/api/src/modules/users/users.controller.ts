import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { AppError } from '../../middleware/errorHandler';

export class UsersController {
  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UsersService.getById(req.supabase, req.user!.id);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  static async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const allowed = ['displayName', 'currency', 'notificationMode', 'alertFrequency', 'budgetResetDay', 'phoneNumber', 'budgetResetInterval', 'onboardingComplete'];
      const updates = Object.fromEntries(
        Object.entries(req.body).filter(([key]) => allowed.includes(key))
      );
      if (Object.keys(updates).length === 0) throw new AppError('No valid fields to update', 400);
      const user = await UsersService.update(req.supabase, req.user!.id, updates);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  static async deleteMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { password } = req.body;
      if (!password) throw new AppError('Password confirmation required', 400);
      await UsersService.deleteAccount(req.supabase, req.user!.id, password);
      res.clearCookie('refresh_token').json({ success: true, message: 'Account deleted' });
    } catch (err) {
      next(err);
    }
  }
}
