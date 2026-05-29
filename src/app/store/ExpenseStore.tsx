import React, { createContext, useContext, useState, useEffect } from 'react';

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
}

export interface User {
  name: string;
  email: string;
  currency: string;
  emailConnected: boolean;
  notificationsEnabled: boolean;
  onboardingComplete: boolean;
}

interface ExpenseContextType {
  user: User;
  expenses: Expense[];
  budgets: Budget[];
  updateUser: (user: Partial<User>) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;
  setBudget: (category: string, limit: number) => void;
  getTotalSpent: () => number;
  getSpentByCategory: (category: string) => number;
  getCategoryPercentage: (category: string) => number;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

const CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Travel',
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

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>({
    name: '',
    email: '',
    currency: 'USD',
    emailConnected: false,
    notificationsEnabled: false,
    onboardingComplete: false
  });

  const [expenses, setExpenses] = useState<Expense[]>([
    {
      id: '1',
      amount: 45.99,
      category: 'Food & Dining',
      merchant: 'Starbucks',
      date: new Date(2026, 4, 24),
      description: 'Morning coffee',
      tags: ['coffee', 'breakfast'],
      source: 'manual'
    },
    {
      id: '2',
      amount: 23.50,
      category: 'Transportation',
      merchant: 'Uber',
      date: new Date(2026, 4, 23),
      description: 'Ride to downtown',
      tags: ['commute', 'ride-share'],
      source: 'email'
    },
    {
      id: '3',
      amount: 156.00,
      category: 'Shopping',
      merchant: 'Amazon',
      date: new Date(2026, 4, 22),
      description: 'Electronics',
      tags: ['online', 'gadgets'],
      source: 'email'
    },
    {
      id: '4',
      amount: 89.99,
      category: 'Entertainment',
      merchant: 'Netflix',
      date: new Date(2026, 4, 21),
      description: 'Monthly subscription',
      tags: ['streaming', 'subscription'],
      source: 'manual'
    },
    {
      id: '5',
      amount: 250.00,
      category: 'Bills & Utilities',
      merchant: 'Electric Company',
      date: new Date(2026, 4, 20),
      description: 'Monthly electric bill',
      tags: ['utilities', 'recurring'],
      source: 'email'
    }
  ]);

  const [budgets, setBudgets] = useState<Budget[]>([
    { category: 'Food & Dining', limit: 500, spent: 0 },
    { category: 'Transportation', limit: 300, spent: 0 },
    { category: 'Shopping', limit: 400, spent: 0 },
    { category: 'Entertainment', limit: 200, spent: 0 },
    { category: 'Bills & Utilities', limit: 600, spent: 0 }
  ]);

  // Update budget spent amounts when expenses change
  useEffect(() => {
    const updatedBudgets = budgets.map(budget => ({
      ...budget,
      spent: expenses
        .filter(e => e.category === budget.category)
        .reduce((sum, e) => sum + e.amount, 0)
    }));
    setBudgets(updatedBudgets);
  }, [expenses]);

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  const addExpense = (expense: Omit<Expense, 'id'>) => {
    const newExpense = {
      ...expense,
      id: Date.now().toString()
    };
    setExpenses(prev => [newExpense, ...prev]);
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const setBudget = (category: string, limit: number) => {
    setBudgets(prev => {
      const existing = prev.find(b => b.category === category);
      if (existing) {
        return prev.map(b => b.category === category ? { ...b, limit } : b);
      } else {
        return [...prev, { category, limit, spent: getSpentByCategory(category) }];
      }
    });
  };

  const getTotalSpent = () => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  };

  const getSpentByCategory = (category: string) => {
    return expenses
      .filter(e => e.category === category)
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
        updateUser,
        addExpense,
        deleteExpense,
        setBudget,
        getTotalSpent,
        getSpentByCategory,
        getCategoryPercentage
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
