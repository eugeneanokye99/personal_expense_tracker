import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { redis } from '../config/redis';
import { AppError } from './errorHandler';

interface JwtPayload {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
}

// Augment Express Request to carry verified user
declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
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
    let payload: JwtPayload;

    try {
      payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      throw new AppError('Invalid or expired token', 401);
    }

    // Check token is not blacklisted (logged out)
    const blacklisted = await redis.exists(`jwt:blacklist:${payload.jti}`);
    if (blacklisted) throw new AppError('Token has been revoked', 401);

    req.user = { id: payload.sub };
    next();
  } catch (err) {
    next(err);
  }
}
