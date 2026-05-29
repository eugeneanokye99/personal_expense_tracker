import { useState } from 'react';
import { motion } from 'motion/react';
import { X, DollarSign, Target } from 'lucide-react';
import { useExpenseStore, CATEGORIES } from '../store/ExpenseStore';
import { toast } from 'sonner';

interface BudgetSettingsProps {
  onClose: () => void;
}

export default function BudgetSettings({ onClose }: BudgetSettingsProps) {
  const { budgets, setBudget, user } = useExpenseStore();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCategory || !budgetAmount) {
      toast.error('Please fill in all fields');
      return;
    }

    const amount = parseFloat(budgetAmount);
    if (amount <= 0) {
      toast.error('Budget amount must be greater than 0');
      return;
    }

    setBudget(selectedCategory, amount);
    toast.success('Budget set successfully!', {
      description: `${selectedCategory}: ${currencySymbol}${amount.toFixed(2)}`
    });

    setSelectedCategory('');
    setBudgetAmount('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-xl mb-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Budget Settings</h2>
            <p className="text-slate-400 text-sm">Set spending limits for each category</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
        >
          <option value="">Select category</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <input
          type="number"
          step="0.01"
          value={budgetAmount}
          onChange={(e) => setBudgetAmount(e.target.value)}
          placeholder="Budget amount"
          className="px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
        />

        <button
          type="submit"
          className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-500/30 transition-all"
        >
          Set Budget
        </button>
      </form>

      <div className="space-y-3">
        <h3 className="text-slate-400 text-sm font-medium">Current Budgets</h3>
        {budgets.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No budgets set yet. Add one above!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {budgets.map((budget, index) => {
              const percentage = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;
              const status = percentage >= 100 ? 'over' : percentage >= 80 ? 'warning' : 'good';

              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl border ${
                    status === 'over'
                      ? 'bg-red-500/10 border-red-500/30'
                      : status === 'warning'
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-green-500/10 border-green-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{budget.category}</span>
                    <span className={`text-sm ${
                      status === 'over'
                        ? 'text-red-400'
                        : status === 'warning'
                        ? 'text-amber-400'
                        : 'text-green-400'
                    }`}>
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-slate-400 text-sm">
                    {currencySymbol}{budget.spent.toFixed(2)} / {currencySymbol}{budget.limit.toFixed(2)}
                  </div>
                  <div className="mt-2 w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        status === 'over'
                          ? 'bg-red-500'
                          : status === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
        <div className="text-sm text-slate-300">
          <strong className="text-violet-300">Tip:</strong> You'll get notified when you reach 80% of your budget and when you go over. Stay on track!
        </div>
      </div>
    </motion.div>
  );
}
