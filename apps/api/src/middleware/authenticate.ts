/* eslint-disable @typescript-eslint/no-namespace */
import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { supabase as adminSupabase } from '../config/database';
import { AppError } from './errorHandler';

// Augment Express Request to carry verified user and request-specific Supabase client
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email?: string };
      supabase?: SupabaseClient;
    }
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Missing or invalid Authorization header', 401);
    }

    const token = authHeader.split(' ')[1];

    // Authenticate the user token directly via Supabase Auth
    const { data: { user }, error } = await adminSupabase.auth.getUser(token);
    if (error || !user) {
      throw new AppError('Invalid or expired Supabase authentication token', 401);
    }

    // Store user session on request
    req.user = { id: user.id, email: user.email };

    // Initialize request-specific Supabase client signed with user's JWT to enforce RLS
    req.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    next();
  } catch (err) {
    next(err);
  }
}
