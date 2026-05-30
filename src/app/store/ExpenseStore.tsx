import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

export interface Expense {
  id: string;
  amount: number;
  category: string;
  merchant: string;
  date: Date;
  description: string;
  tags: string[];
  source: 'manual' | 'email';
}

export interface Budget {
  category: string;
  limit: number;
  spent: number;
  resetInterval: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  resetDay?: number;
}

export interface User {
  name: string;
  email: string;
  currency: string;
  emailConnected: boolean;
  notificationsEnabled: boolean;
  onboardingComplete: boolean;
  budgetResetInterval?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  budgetResetDay?: number;
  phoneNumber?: string;
}

interface ExpenseContextType {
  user: User;
  expenses: Expense[];
  budgets: Budget[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, displayName: string, payDay?: number, phoneNumber?: string, budgetResetInterval?: 'weekly' | 'monthly' | 'quarterly' | 'yearly') => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  setBudget: (category: string, limit: number, resetInterval?: 'weekly' | 'monthly' | 'quarterly' | 'yearly', resetDay?: number) => Promise<void>;
  uploadStatement: (file: File) => Promise<boolean>;
  getTotalSpent: () => number;
  getSpentByCategory: (category: string) => number;
  getCategoryPercentage: (category: string) => number;
  fetchData: () => Promise<void>;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

const CATEGORIES = [
  'Food',
  'Transport',
  'Utilities',
  'Health',
  'Entertainment',
  'Housing',
  'Shopping',
  'Transfers',
  'Other'
];

const FUNNY_MESSAGES = [
  "If book idea, it is post-joke but blunt by playing you.",
  "Nice. Human wins!",
  "Test! Awesome under budget. Nice. Human wins!",
  "Uh oh. The spending monster is awake."
];

const ENCOURAGING_MESSAGES = [
  "Test! Awesome under budget. Nice. Human wins!",
  "You're crushing it! Keep it up!",
  "Wow, look at you being all responsible!"
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Configure Axios Instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>({
    name: '',
    email: '',
    currency: 'GHS',
    emailConnected: false,
    notificationsEnabled: false,
    onboardingComplete: false,
    budgetResetInterval: 'monthly',
    budgetResetDay: 1,
    phoneNumber: '',
  });

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Silent JWT Refresh interceptor
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (res) => res,
      async (err) => {
        const originalRequest = err.config;
        if (err.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
            return api(originalRequest);
          } catch (refreshErr) {
            setIsAuthenticated(false);
            setUser(prev => ({ ...prev, onboardingComplete: false }));
          }
        }
        return Promise.reject(err);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  // Check login status on launch
  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await api.get('/users/me');
        if (res.data?.success && res.data?.data) {
          const profile = res.data.data;
          setUser({
            name: profile.display_name,
            email: profile.email,
            currency: profile.currency || 'GHS',
            emailConnected: true,
            notificationsEnabled: profile.alert_frequency !== 'off',
            onboardingComplete: profile.onboarding_complete,
            budgetResetInterval: profile.budget_reset_interval || 'monthly',
            budgetResetDay: profile.budget_reset_day || 1,
            phoneNumber: profile.phone_number,
          });
          setIsAuthenticated(true);
          await fetchData();
        }
      } catch (err) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      // 1. Fetch Expenses (all page 1 items up to 1000)
      const expensesRes = await api.get('/expenses', { params: { page: 1, limit: 1000 } });
      if (expensesRes.data?.success) {
        const items = expensesRes.data.data.items || [];
        setExpenses(items.map((e: any) => ({
          id: e.id,
          amount: Number(e.amount),
          category: e.category,
          merchant: e.merchant,
          date: new Date(e.date),
          description: e.note || '',
          tags: [e.channel || 'manual'],
          source: e.source,
        })));
      }

      // 2. Fetch Budgets
      const budgetsRes = await api.get('/budgets');
      if (budgetsRes.data?.success) {
        const items = budgetsRes.data.data || [];
        setBudgets(items.map((b: any) => ({
          category: b.category,
          limit: Number(b.limitAmount),
          spent: Number(b.spent || 0),
          resetInterval: b.resetInterval || 'monthly',
          resetDay: b.resetDay,
        })));
      }
    } catch (err) {
      console.error('Failed to fetch data from API:', err);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data?.success) {
        setIsAuthenticated(true);
        toast.success('Logged in successfully!');
        return true;
      }
      return false;
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
      return false;
    }
  };

  const register = async (
    email: string,
    password: string,
    displayName: string,
    payDay?: number,
    phoneNumber?: string,
    budgetResetInterval?: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  ): Promise<boolean> => {
    try {
      const res = await api.post('/auth/register', {
        email,
        password,
        displayName,
        payDay,
        phoneNumber,
        budgetResetInterval,
      });
      if (res.data?.success) {
        toast.success('Account created! Logging you in...');
        return login(email, password);
      }
      return false;
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
      return false;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      setIsAuthenticated(false);
      setUser({
        name: '',
        email: '',
        currency: 'GHS',
        emailConnected: false,
        notificationsEnabled: false,
        onboardingComplete: false,
        budgetResetInterval: 'monthly',
        budgetResetDay: 1,
        phoneNumber: '',
      });
      setExpenses([]);
      setBudgets([]);
      toast.success('Logged out successfully');
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    try {
      const payload: any = {};
      if (updates.name !== undefined) payload.displayName = updates.name;
      if (updates.currency !== undefined) payload.currency = updates.currency;
      if (updates.notificationsEnabled !== undefined) {
        payload.alertFrequency = updates.notificationsEnabled ? 'all' : 'off';
      }
      if (updates.onboardingComplete !== undefined) {
        payload.onboardingComplete = updates.onboardingComplete;
      }
      if (updates.budgetResetInterval !== undefined) {
        payload.budgetResetInterval = updates.budgetResetInterval;
      }
      if (updates.budgetResetDay !== undefined) {
        payload.budgetResetDay = updates.budgetResetDay;
      }
      if (updates.phoneNumber !== undefined) {
        payload.phoneNumber = updates.phoneNumber;
      }

      const res = await api.patch('/users/me', payload);
      if (res.data?.success) {
        setUser(prev => ({ ...prev, ...updates }));
        toast.success('Profile settings updated!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update settings');
    }
  };

  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    try {
      const res = await api.post('/expenses', {
        amount: expense.amount,
        category: expense.category,
        merchant: expense.merchant,
        note: expense.description,
        date: expense.date.toISOString(),
        source: expense.source,
        transactionType: 'debit',
      });

      if (res.data?.success) {
        await fetchData(); // refresh list & computed budgets
        toast.success('Expense added successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add expense');
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const res = await api.delete(`/expenses/${id}`);
      if (res.data?.success) {
        setExpenses(prev => prev.filter(e => e.id !== id));
        await fetchData(); // recompute budgets
        toast.success('Expense deleted');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete expense');
    }
  };

  const setBudget = async (category: string, limit: number, resetInterval?: 'weekly' | 'monthly' | 'quarterly' | 'yearly', resetDay?: number) => {
    try {
      const res = await api.post('/budgets', {
        category,
        limitAmount: limit,
        resetInterval,
        resetDay,
      });

      if (res.data?.success) {
        await fetchData();
        toast.success(`Budget for ${category} updated!`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to set budget');
    }
  };

  const uploadStatement = async (file: File): Promise<boolean> => {
    const formData = new FormData();
    formData.append('statement', file);

    try {
      const res = await api.post('/expenses/upload-statement', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        const stats = res.data.data;
        toast.success(`Parsed ${stats.parsedCount} entries! Saved: ${stats.savedCount}, Pending: ${stats.pendingCount}, Duplicates: ${stats.duplicateCount}`);
        await fetchData();
        return true;
      }
      return false;
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to parse statement');
      return false;
    }
  };

  const getTotalSpent = () => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  };

  const getSpentByCategory = (category: string) => {
    return expenses
      .filter(e => e.category.toLowerCase() === category.toLowerCase())
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const getCategoryPercentage = (category: string) => {
    const total = getTotalSpent();
    if (total === 0) return 0;
    return (getSpentByCategory(category) / total) * 100;
  };

  return (
    <ExpenseContext.Provider
      value={{
        user,
        expenses,
        budgets,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        updateUser,
        addExpense,
        deleteExpense,
        setBudget,
        uploadStatement,
        getTotalSpent,
        getSpentByCategory,
        getCategoryPercentage,
        fetchData
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpenseStore = () => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpenseStore must be used within ExpenseProvider');
  }
  return context;
};

export { CATEGORIES, FUNNY_MESSAGES, ENCOURAGING_MESSAGES };
