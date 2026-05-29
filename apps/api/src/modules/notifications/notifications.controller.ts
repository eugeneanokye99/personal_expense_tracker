import { Request, Response, NextFunction } from 'express';
import { NotificationsService } from './notifications.service';

export class NotificationsController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notifications = await NotificationsService.list(req.user!.id);
      res.json({ success: true, data: notifications });
    } catch (err) { next(err); }
  }

  static async unreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await NotificationsService.unreadCount(req.user!.id);
      res.json({ success: true, data: { count } });
    } catch (err) { next(err); }
  }

  static async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await NotificationsService.markRead(req.user!.id, req.params.id);
      res.json({ success: true });
    } catch (err) { next(err); }
  }

  static async dismiss(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await NotificationsService.dismiss(req.user!.id, req.params.id);
      res.json({ success: true });
    } catch (err) { next(err); }
  }
}
