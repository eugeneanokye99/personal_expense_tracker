import { z } from 'zod';

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  FRONTEND_URL: z.string().url(),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

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
});

function parseEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
