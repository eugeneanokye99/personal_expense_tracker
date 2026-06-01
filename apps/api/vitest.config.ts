import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**'],
    env: {
      NODE_ENV: 'test',
      PORT: '3000',
      FRONTEND_URL: 'http://localhost:5173',
      SUPABASE_URL: 'https://mock.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'mock-key-role-service-role-key-admin',
      SUPABASE_ANON_KEY: 'mock-anon-key-public',
      REDIS_URL: 'redis://localhost:6379',
      RABBITMQ_URL: 'amqp://localhost:5672',
      JWT_SECRET: 'mock-jwt-secret-very-long-secret-key-32-chars',
      JWT_REFRESH_SECRET: 'mock-jwt-refresh-secret-very-long-secret-key-32-chars',
      ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      GOOGLE_CLIENT_ID: 'mock-id',
      GOOGLE_CLIENT_SECRET: 'mock-secret',
      GOOGLE_CALLBACK_URL: 'http://localhost:3000/callback',
      ARKESEL_API_KEY: 'mock-key',
      ARKESEL_SENDER_ID: 'SpendWisely',
    },
  },
});
