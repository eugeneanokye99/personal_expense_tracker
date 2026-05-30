import crypto from 'crypto';
import { supabase } from '../../config/database';
import { redis } from '../../config/redis';
import { UsersRepository } from '../users/users.repository';
import { AppError } from '../../middleware/errorHandler';
import { getGmailOAuthClient, exchangeCodeForTokens, encryptToken } from './gmail.oauth';
import { publishToQueue } from '../../config/rabbitmq';
import type { RegisterDto, LoginResult } from '../../../../../packages/shared/types';

export class AuthService {
  static async register(dto: RegisterDto): Promise<{ user: object }> {
    const existing = await UsersRepository.findByEmail(supabase, dto.email);
    if (existing) throw new AppError('Email already registered', 409);

    // Create user in Supabase Auth system
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
    });

    if (authError || !authUser.user) {
      throw new AppError(authError?.message || 'Failed to register user in Auth engine', 500);
    }

    // Persist profile metadata in our public users table
    const user = await UsersRepository.create(supabase, {
      id: authUser.user.id,
      email: dto.email,
      displayName: dto.displayName,
      budgetResetDay: dto.payDay ?? 1,
      budgetResetInterval: dto.budgetResetInterval ?? 'monthly',
      phoneNumber: dto.phoneNumber,
    });

    return { user: { id: user.id, email: user.email, displayName: user.display_name } };
  }

  static async login(dto: { email: string; password: string }): Promise<LoginResult> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.session) {
      throw new AppError(error?.message || 'Invalid credentials', 401);
    }

    const user = await UsersRepository.findById(supabase, data.session.user.id);
    if (!user) {
      throw new AppError('User profile not found', 404);
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: { id: user.id, email: user.email, displayName: user.display_name },
    };
  }

  static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      throw new AppError(error?.message || 'Invalid or expired refresh token', 401);
    }

    return { accessToken: data.session.access_token };
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
