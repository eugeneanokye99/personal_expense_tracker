import { Request, Response, NextFunction } from 'express';
import { AchievementsRepository } from './achievements.repository';
import { AppError } from '../../middleware/errorHandler';

export class AchievementsController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const achievements = await AchievementsRepository.listByUser(userId);
      res.json({ success: true, data: achievements });
    } catch (err) {
      next(err);
    }
  }

  static async unlock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { achievementId } = req.body;
      if (!achievementId) throw new AppError('achievementId is required', 400);

      await AchievementsRepository.unlock(userId, achievementId);
      res.json({ success: true, message: 'Achievement unlocked successfully' });
    } catch (err) {
      next(err);
    }
  }
}
