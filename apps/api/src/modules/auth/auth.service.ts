import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { supabase } from '../../config/database';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import { UsersRepository } from '../users/users.repository';
import { AppError } from '../../middleware/errorHandler';
import { getGmailOAuthClient, exchangeCodeForTokens, encryptToken } from './gmail.oauth';
import { publishToQueue } from '../../config/rabbitmq';
import type { RegisterDto, LoginResult } from '../../../../../packages/shared/types';

export class AuthService {
  static async register(dto: RegisterDto): Promise<{ user: object }> {
    const existing = await UsersRepository.findByEmail(dto.email);
    if (existing) throw new AppError('Email already registered', 409);

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await UsersRepository.create({
      email: dto.email,
      displayName: dto.displayName,
      passwordHash,
      budgetResetDay: dto.payDay ?? 1,
    });

    return { user: { id: user.id, email: user.email, displayName: user.display_name } };
  }

  static async login(dto: { email: string; password: string }): Promise<LoginResult> {
    const user = await UsersRepository.findByEmail(dto.email);
    if (!user) throw new AppError('Invalid credentials', 401);

    const valid = await bcrypt.compare(dto.password, user.password_hash ?? '');
    if (!valid) throw new AppError('Invalid credentials', 401);

    const jti = crypto.randomUUID();
    const accessToken = jwt.sign({ sub: user.id, jti }, env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ sub: user.id, jti }, env.JWT_REFRESH_SECRET, { expiresIn: '30d' });

    await redis.set(`refresh_token:${user.id}:${jti}`, '1', 'EX', 30 * 24 * 60 * 60);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, displayName: user.display_name },
    };
  }

  static async blacklistToken(token: string): Promise<void> {
    const decoded = jwt.decode(token) as { jti?: string; exp?: number } | null;
    if (!decoded?.jti || !decoded.exp) return;
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await redis.set(`jwt:blacklist:${decoded.jti}`, '1', 'EX', ttl);
  }

  static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    let decoded: { sub: string; jti: string };
    try {
      decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub: string; jti: string };
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const exists = await redis.exists(`refresh_token:${decoded.sub}:${decoded.jti}`);
    if (!exists) throw new AppError('Refresh token revoked', 401);

    const newJti = crypto.randomUUID();
    const accessToken = jwt.sign({ sub: decoded.sub, jti: newJti }, env.JWT_SECRET, { expiresIn: '15m' });
    return { accessToken };
  }

  static async getGmailOAuthUrl(userId: string): Promise<string> {
    const state = crypto.randomBytes(32).toString('hex');
    await redis.set(`oauth:state:${state}`, userId, 'EX', 600);
    const client = getGmailOAuthClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      state,
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
    });
  }

  static async handleGmailCallback(code: string, state: string): Promise<void> {
    const userId = await redis.get(`oauth:state:${state}`);
    if (!userId) throw new AppError('Invalid or expired OAuth state', 400);
    await redis.del(`oauth:state:${state}`);

    const { accessToken, refreshToken, expiry, emailAddress, historyId } =
      await exchangeCodeForTokens(code);

    const { data, error } = await supabase.from('email_accounts').upsert({
      user_id: userId,
      provider: 'gmail',
      email_address: emailAddress,
      access_token_enc: encryptToken(accessToken),
      refresh_token_enc: encryptToken(refreshToken),
      token_expiry: new Date(expiry).toISOString(),
      history_id: historyId,
      is_active: true,
    }, { onConflict: 'user_id,email_address' });

    if (error) throw new AppError('Failed to save Gmail account', 500);

    await publishToQueue('email.poll.queue', {
      emailAccountId: (data as any)?.[0]?.id,
      userId,
      provider: 'gmail',
    });
  }
}
