// =============================================================================
// SPENDWISELY — Shared TypeScript Types
// Used by both apps/web and apps/api
// =============================================================================

// ---------------------------------------------------------------------------
// Core Domain Entities
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  currency: string; // default: 'GHS'
  notificationMode: 'funny' | 'serious';
  alertFrequency: 'all' | 'budget' | 'weekly' | 'off';
  budgetResetDay: number; // 1–28, default: 1 (set to payday during onboarding)
  onboardingComplete: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  category: string;
  merchant: string;
  description?: string;
  note?: string;
  date: string; // ISO string
  source: 'manual' | 'email';
  transactionType: 'debit' | 'credit';
  channel?: string; // 'MTN MoMo' | 'GCB Bank' | 'Ecobank' | ...
  emailMessageId?: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  limitAmount: number;
  resetDay: number; // 1–28
  lastResetAt: string; // ISO — start of current budget period
  // Computed fields returned by API
  spent?: number;
  remaining?: number;
  percentage?: number;
  status?: 'good' | 'warning' | 'over';
}

export interface BudgetHistory {
  id: string;
  budgetId: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  limitAmount: number;
  totalSpent: number;
  createdAt: string;
}

export interface EmailAccount {
  id: string;
  userId: string;
  provider: 'gmail' | 'outlook';
  emailAddress: string;
  lastScannedAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface PendingEmailTransaction {
  id: string;
  userId: string;
  gmailMessageId: string;
  parsedAmount: number;
  merchant: string;
  suggestedCategory: string;
  transactionType: 'debit' | 'credit';
  channel: string;
  confidence: number; // 0–100
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: 'transactional' | 'funny' | 'encouraging';
  trigger: string;
  message: string;
  firedAt: string;
  dismissed: boolean;
  readAt?: string;
}

// ---------------------------------------------------------------------------
// DTOs (Data Transfer Objects) — API Input Shapes
// ---------------------------------------------------------------------------

export interface RegisterDto {
  email: string;
  password: string;
  displayName: string;
  phoneNumber?: string;
  payDay?: number; // 1–28 — sets budgetResetDay default
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: Pick<User, 'id' | 'email' | 'displayName'>;
}

export interface CreateUserDto {
  email: string;
  displayName: string;
  passwordHash?: string;
  googleId?: string;
  budgetResetDay?: number;
  phoneNumber?: string;
}

export interface UpdateUserDto {
  displayName?: string;
  currency?: string;
  notificationMode?: 'funny' | 'serious';
  alertFrequency?: 'all' | 'budget' | 'weekly' | 'off';
  budgetResetDay?: number;
  phoneNumber?: string;
}

export interface CreateExpenseDto {
  amount: number;
  category: string;
  merchant: string;
  description?: string;
  note?: string;
  date?: string;
  source: 'manual' | 'email';
  transactionType?: 'debit' | 'credit';
  channel?: string;
  emailMessageId?: string;
}

export interface UpdateExpenseDto {
  category?: string;
  merchant?: string;
  note?: string;
  amount?: number;
  date?: string;
  transactionType?: 'debit' | 'credit';
}

export interface UpsertBudgetDto {
  category: string;
  limitAmount: number;
  resetDay?: number; // if omitted, inherits from user.budgetResetDay
}

export interface ExpenseFilters {
  page?: number;
  limit?: number;
  category?: string;
  source?: 'manual' | 'email';
  from?: string; // ISO date
  to?: string; // ISO date
  amountMin?: number;
  amountMax?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// Notification Engine Types
// ---------------------------------------------------------------------------

export interface NotificationMessage {
  userId: string;
  type: 'transactional' | 'funny' | 'encouraging';
  trigger: string;
  payload: {
    title: string;
    body: string;
    expenseId?: string;
  };
}

// ---------------------------------------------------------------------------
// RabbitMQ Message Schemas
// ---------------------------------------------------------------------------

export interface EmailPollMessage {
  emailAccountId: string;
  userId: string;
  provider: 'gmail';
}

export interface EmailParseMessage {
  emailAccountId: string;
  userId: string;
  gmailMessageId: string;
  senderEmail: string;
  subject: string;
  bodyText: string;
  receivedAt: string;
}

export interface PatternCheckMessage {
  userId: string;
  expenseId: string;
  category: string;
  merchant: string;
  amount: number;
  date: string;
}

export interface BudgetResetMessage {
  date: string; // YYYY-MM-DD
}

// ---------------------------------------------------------------------------
// API Response Wrapper
// ---------------------------------------------------------------------------

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Ghana-Specific Constants
// ---------------------------------------------------------------------------

export const GH_CATEGORIES = [
  'Food',
  'Transport',
  'Utilities',
  'Health',
  'Entertainment',
  'Housing',
  'Shopping',
  'Transfers',
  'Other',
] as const;

export type GhanaCategory = typeof GH_CATEGORIES[number];

export const CATEGORY_EMOJI: Record<string, string> = {
  Food: '🍽️',
  Transport: '🚗',
  Utilities: '⚡',
  Health: '🏥',
  Entertainment: '🎭',
  Housing: '🏠',
  Shopping: '🛍️',
  Transfers: '💸',
  Other: '📦',
};

export const CURRENCIES = [
  { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
] as const;
