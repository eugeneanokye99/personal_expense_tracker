import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { AppError } from './errorHandler';

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 60; // per minute per IP

export async function rateLimiter(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ip = req.ip ?? 'unknown';
    const key = `ratelimit:${ip}:${req.path}`;
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, WINDOW_SECONDS);
    if (current > MAX_REQUESTS) {
      throw new AppError(`Too many requests. Limit: ${MAX_REQUESTS}/min.`, 429);
    }
    next();
  } catch (err) {
    next(err);
  }
}
