import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Operational errors — safe to expose message to client
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Unexpected errors — log full detail, return generic message to client
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'An unexpected error occurred. Please try again.',
  });
}
