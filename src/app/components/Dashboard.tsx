import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { useExpenseStore, FUNNY_MESSAGES, ENCOURAGING_MESSAGES } from '../store/ExpenseStore';
import SpendRing from './SpendRing';
import EmailSimulation from './EmailSimulation';
import { format } from 'date-fns';

export default function Dashboard() {
  const { expenses, budgets, getTotalSpent, user } = useExpenseStore();
  const [funnyMessage, setFunnyMessage] = useState('');

  useEffect(() => {
    const randomMessage = Math.random() > 0.5
      ? FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)]
      : ENCOURAGING_MESSAGES[Math.floor(Math.random() * ENCOURAGING_MESSAGES.length)];
    setFunnyMessage(randomMessage);
  }, []);

  const categoryTotals = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  const budgetStatus = budgets.map(budget => ({
    ...budget,
    percentage: budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0,
    status: budget.spent / budget.limit >= 1 ? 'over' : budget.spent / budget.limit >= 0.8 ? 'warning' : 'good'
  }));

  const overBudgetCount = budgetStatus.filter(b => b.status === 'over').length;
  const warningBudgetCount = budgetStatus.filter(b => b.status === 'warning').length;

  const getCurrencySymbol = (code: string) => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CAD': 'C$',
      'AUD': 'A$',
      'GHS': '₵'
    };
    return symbols[code] || '$';
  };

  const currencySymbol = getCurrencySymbol(user.currency);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-pink-500/20 border border-violet-500/30 rounded-3xl p-5 sm:p-8 shadow-2xl"
      >
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
          <div>
            <div className="text-slate-400 text-xs sm:text-sm mb-1 sm:mb-2">Total Spent This Month</div>
            <div className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
              {currencySymbol}{getTotalSpent().toFixed(2)}
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-violet-500/20 rounded-xl border border-violet-500/30 self-start sm:self-auto">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
            <span className="text-violet-300 text-xs sm:text-sm font-medium">{format(new Date(), 'MMMM yyyy')}</span>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-2xl p-4 sm:p-6 border border-slate-800">
          <div className="text-slate-300 text-xs sm:text-sm mb-1 italic leading-relaxed">"{funnyMessage}"</div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl"
        >
          <h3 className="text-slate-400 mb-6">Spending Overview</h3>
          <SpendRing />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl"
        >
          <h3 className="text-slate-400 mb-6">Top Category</h3>
          {topCategory && (
            <div className="space-y-4">
              <div className="text-3xl font-bold text-white">{topCategory[0]}</div>
              <div className="text-2xl text-violet-400">{currencySymbol}{topCategory[1].toFixed(2)}</div>
              <div className="flex items-center gap-2 text-slate-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">
                  {((topCategory[1] / getTotalSpent()) * 100).toFixed(1)}% of total
                </span>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl"
        >
          <h3 className="text-slate-400 mb-6">Budget Status</h3>
          {budgets.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-slate-500 mb-2">No budgets set yet</div>
              <div className="text-sm text-slate-600">Go to Analytics to set budgets</div>
            </div>
          ) : (
            <div className="space-y-4">
              {overBudgetCount > 0 && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <div>
                    <div className="text-red-400 font-medium">{overBudgetCount} over budget</div>
                    <div className="text-red-300/60 text-sm">Time to slow down!</div>
                  </div>
                </div>
              )}
              {warningBudgetCount > 0 && (
                <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                  <div>
                    <div className="text-amber-400 font-medium">{warningBudgetCount} near limit</div>
                    <div className="text-amber-300/60 text-sm">80% threshold reached</div>
                  </div>
                </div>
              )}
              {overBudgetCount === 0 && warningBudgetCount === 0 && (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <div>
                    <div className="text-green-400 font-medium">All good!</div>
                    <div className="text-green-300/60 text-sm">You're on track</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl"
        >
          <h3 className="text-slate-400 mb-6">Recent Transactions</h3>
          <div className="space-y-2 sm:space-y-3">
            {expenses.slice(0, 8).map((expense, index) => (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index }}
                className="flex items-center justify-between p-3 sm:p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors group gap-2 min-w-0"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-lg sm:text-xl">{expense.category[0]}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-white font-medium truncate text-sm sm:text-base">{expense.merchant}</div>
                    <div className="text-slate-400 text-xs sm:text-sm flex items-center gap-1.5 truncate">
                      <span>{expense.category}</span>
                      {expense.source === 'email' && (
                        <span className="px-1.5 py-0.5 bg-violet-500/20 text-violet-300 rounded text-[10px] sm:text-xs">Auto</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-white font-semibold text-sm sm:text-base">{currencySymbol}{expense.amount.toFixed(2)}</div>
                  <div className="text-slate-500 text-xs sm:text-sm">{format(new Date(expense.date), 'MMM dd')}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <EmailSimulation />
        </motion.div>
      </div>
    </div>
  );
}
