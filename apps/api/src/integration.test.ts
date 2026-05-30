import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from './server';
import { env } from './config/env';

// ── Mock Redis Client ──────────────────────────────────────────────────────
vi.mock('./config/redis', () => {
  return {
    redis: {
      exists: vi.fn().mockResolvedValue(0),
      set: vi.fn().mockResolvedValue('OK'),
      get: vi.fn().mockResolvedValue(null),
      del: vi.fn().mockResolvedValue(1),
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(1),
    },
  };
});

// ── Mock Supabase JS SDK ───────────────────────────────────────────────────
vi.mock('@supabase/supabase-js', () => {
  const mockUsersResponse = {
    data: [
      {
        id: 'mock-user-123',
        display_name: 'Eugene',
        notification_mode: 'funny',
        phone_number: '+233244123456',
        budget_reset_day: 1,
        budget_reset_interval: 'monthly',
      },
    ],
    error: null,
  };

  const mockEmptyCountResponse = {
    count: 0,
    data: null,
    error: null,
  };

  const mockSelect = vi.fn().mockImplementation((_fields, options) => {
    if (options?.count === 'exact') {
      return {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue(mockEmptyCountResponse),
      };
    }
    return {
      neq: vi.fn().mockResolvedValue(mockUsersResponse),
    };
  });

  const mockFrom = vi.fn().mockImplementation((table) => {
    if (table === 'users') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUsersResponse.data[0],
              error: null,
            }),
          }),
          neq: vi.fn().mockResolvedValue(mockUsersResponse),
        }),
      };
    }
    if (table === 'expenses') {
      return {
        select: mockSelect,
        insert: vi.fn().mockResolvedValue({
          data: {
            id: 'mock-expense-999',
            user_id: 'mock-user-123',
            amount: 75.50,
            category: 'Food',
            merchant: 'Shoprite',
            date: new Date().toISOString(),
            source: 'email',
            transaction_type: 'debit',
          },
          error: null,
        }),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
  });

  return {
    createClient: vi.fn().mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'mock-user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: mockFrom,
    }),
  };
});

// Mock config/database to return the mock supabase client
vi.mock('./config/database', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return {
    supabase: createClient('https://mock.supabase.co', 'mock-key'),
  };
});

// ── Mock RabbitMQ Client ───────────────────────────────────────────────────
vi.mock('./config/rabbitmq', () => {
  return {
    publishToQueue: vi.fn().mockResolvedValue(undefined),
    QUEUES: {
      EMAIL_POLL: 'email.poll.queue',
      EMAIL_PARSE: 'email.parse.queue',
      NOTIFICATION: 'notification.queue',
      BUDGET_RESET: 'budget.reset.queue',
      PATTERN_CHECK: 'pattern.check.queue',
    },
  };
});

describe('SpendWisely End-to-End Endpoint Integration Tests', () => {
  let authToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    // Generate a valid JWT for the authenticated endpoints
    authToken = jwt.sign({ sub: 'mock-user-123', jti: 'test-jti' }, env.JWT_SECRET, {
      expiresIn: '15m',
    });
  });

  describe('POST /api/v1/expenses/upload-statement', () => {
    it('should fail with 401 when Authorization header is missing', async () => {
      const res = await request(app)
        .post('/api/v1/expenses/upload-statement')
        .attach('statement', Buffer.from('mock text'), 'statement.csv');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should successfully upload and parse a MoMo text statement', async () => {
      const mockCsvContent = `
        MTN Mobile Money Transaction Statement
        29/05/2026 14:20:15 Sent to Shoprite GHS 75.50 Reference: Groceries
      `;

      // Mock duplicate check to return false (not duplicate)
      const { ExpensesRepository } = await import('./modules/expenses/expenses.repository');
      vi.spyOn(ExpensesRepository, 'checkExistsByHashOrMetadata').mockResolvedValue(false);

      // Mock Expense creation to return a dummy expense
      const { ExpensesService } = await import('./modules/expenses/expenses.service');
      vi.spyOn(ExpensesService, 'create').mockResolvedValue({
        id: 'mock-expense-999',
        user_id: 'mock-user-123',
        amount: 75.5,
        category: 'Food',
        merchant: 'Shoprite',
        date: new Date().toISOString(),
        source: 'email',
        transaction_type: 'debit',
      } as any);

      const res = await request(app)
        .post('/api/v1/expenses/upload-statement')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('statement', Buffer.from(mockCsvContent), 'statement.csv');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.parsedCount).toBe(1);
      expect(res.body.data.savedCount).toBe(1);
      expect(res.body.data.pendingCount).toBe(0);
      expect(res.body.data.duplicateCount).toBe(0);
    });
  });

  describe('POST /api/v1/notifications/daily-reminder', () => {
    it('should fail with 401 when x-internal-key is missing or invalid', async () => {
      const res = await request(app)
        .post('/api/v1/notifications/daily-reminder');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Unauthorized internal call');
    });

    it('should trigger daily reminders when x-internal-key is valid', async () => {
      const res = await request(app)
        .post('/api/v1/notifications/daily-reminder')
        .set('x-internal-key', env.JWT_SECRET);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('sentCount');
      expect(res.body.data.sentCount).toBe(1);
    });
  });
});
