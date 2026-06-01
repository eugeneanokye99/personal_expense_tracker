import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { AppError } from '../../middleware/errorHandler';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, displayName, payDay, phoneNumber, budgetResetInterval } = req.body;
      if (!email || !password || !displayName) throw new AppError('Missing required fields', 400);
      const result = await AuthService.register({ email, password, displayName, payDay, phoneNumber, budgetResetInterval });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) throw new AppError('Email and password required', 400);
      const result = await AuthService.login({ email, password });
      res
        .cookie('refresh_token', result.refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        })
        .json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.supabase) {
        await req.supabase.auth.signOut();
      }
      res
        .clearCookie('refresh_token', {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        })
        .json({ success: true, message: 'Logged out' });
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refresh_token;
      if (!refreshToken) throw new AppError('Refresh token missing', 401);
      const result = await AuthService.refreshAccessToken(refreshToken);
      res.json({ success: true, data: { accessToken: result.accessToken } });
    } catch (err) {
      next(err);
    }
  }

  static async initiateGmailOAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const authUrl = await AuthService.getGmailOAuthUrl(userId);
      res.json({ success: true, data: { authUrl } });
    } catch (err) {
      next(err);
    }
  }

  static async gmailOAuthCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, state } = req.query as { code: string; state: string };
      if (!code || !state) throw new AppError('Missing OAuth parameters', 400);
      await AuthService.handleGmailCallback(code, state);
      res.redirect(`${process.env.FRONTEND_URL}/settings?gmail=connected`);
    } catch (err) {
      next(err);
    }
  }
}
