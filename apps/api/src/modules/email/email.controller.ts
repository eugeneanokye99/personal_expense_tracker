import { Request, Response, NextFunction } from 'express';
import { EmailService } from './email.service';

export class EmailController {
  static async listAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accounts = await EmailService.listAccounts(req.supabase, req.user!.id);
      res.json({ success: true, data: accounts });
    } catch (err) { next(err); }
  }

  static async disconnectAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await EmailService.disconnect(req.supabase, req.user!.id, req.params.id);
      res.json({ success: true, message: 'Email account disconnected' });
    } catch (err) { next(err); }
  }

  static async triggerScan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await EmailService.triggerManualScan(req.supabase, req.user!.id);
      res.json({ success: true, message: 'Inbox scan triggered' });
    } catch (err) { next(err); }
  }

  static async listPending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pending = await EmailService.listPending(req.supabase, req.user!.id);
      res.json({ success: true, data: pending });
    } catch (err) { next(err); }
  }

  static async confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await EmailService.confirmPending(req.supabase, req.user!.id, req.params.id, req.body);
      res.json({ success: true, data: expense });
    } catch (err) { next(err); }
  }

  static async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await EmailService.rejectPending(req.supabase, req.user!.id, req.params.id);
      res.json({ success: true, message: 'Transaction rejected' });
    } catch (err) { next(err); }
  }
}
