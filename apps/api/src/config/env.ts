import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from the package root directory (apps/api/.env)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  FRONTEND_URL: z.string().url(),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),

  // Redis
  REDIS_URL: z.string().min(1),

  // RabbitMQ
  RABBITMQ_URL: z.string().min(1),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),

  // Encryption (for OAuth tokens at rest — must be 64 hex chars = 32 bytes)
  ENCRYPTION_KEY: z.string().length(64),

  // Google OAuth (Gmail)
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url(),

  // Arkesel SMS Gateway
  ARKESEL_API_KEY: z.string().min(1),
  ARKESEL_SENDER_ID: z.string().default('SpendWisely'),

  // SMTP Email Settings
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default('placeholder@spendwisely.com'),
  SMTP_PASS: z.string().default('placeholder_password'),
  SMTP_SECURE: z.preprocess((v) => v === 'true' || v === true, z.boolean()).default(false),
  SMTP_FROM: z.string().default('SpendWisely <noreply@spendwisely.com>'),
});

function parseEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const errorDetails = JSON.stringify(parsed.error.flatten().fieldErrors, null, 2);
    console.error('❌ Invalid environment variables:\n', errorDetails);
    throw new Error(`Invalid environment variables configuration:\n${errorDetails}`);
  }
  return parsed.data;
}

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
