import { useState } from 'react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Store, AlertCircle, Brain, Settings } from 'lucide-react';
import { useExpenseStore, CATEGORIES } from '../store/ExpenseStore';
import BudgetSettings from './BudgetSettings';
import { format } from 'date-fns';

const CATEGORY_COLORS = {
  'Food & Dining': '#8b5cf6',
  'Transportation': '#06b6d4',
  'Shopping': '#ec4899',
  'Entertainment': '#f59e0b',
  'Bills & Utilities': '#10b981',
  'Healthcare': '#ef4444',
  'Travel': '#3b82f6',
  'Other': '#6b7280'
};

export default function Analytics() {
  const { expenses, budgets, getTotalSpent, user } = useExpenseStore();
  const [showBudgetSettings, setShowBudgetSettings] = useState(false);

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

  const categoryData = Object.entries(
    expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>)
  )
    .map(([category, amount]) => ({
      name: category,
      value: amount,
      color: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.Other
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Generate the last 5 months dynamically based on real expenses
  const getMonthlyTrend = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = [];
    const now = new Date();
    
    // We generate the last 5 months ending with the current month
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = months[d.getMonth()];
      const year = d.getFullYear();
      
      // Calculate total spent in this specific month and year
      const totalForMonth = expenses
        .filter(e => {
          const expenseDate = new Date(e.date);
          return expenseDate.getMonth() === d.getMonth() && expenseDate.getFullYear() === year;
        })
        .reduce((sum, e) => sum + e.amount, 0);
        
      result.push({
        month: monthName,
        amount: Number(totalForMonth.toFixed(2))
      });
    }
    return result;
  };

  const monthlyData = getMonthlyTrend();

  const merchantTotals = expenses.reduce((acc, expense) => {
    acc[expense.merchant] = (acc[expense.merchant] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const topMerchants = Object.entries(merchantTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const generateAISummary = () => {
    const total = getTotalSpent();
    const topCategory = categoryData[0];
    const avgDaily = total / 25;

    const summaries = [
      `You've spent ${currencySymbol}${total.toFixed(2)} this month. Your biggest category is ${topCategory?.name} at ${currencySymbol}${topCategory?.value.toFixed(2)}. Daily average is ${currencySymbol}${avgDaily.toFixed(2)}. Keep an eye on ${topCategory?.name} spending!`,
      `${format(new Date(), 'MMMM')} spending: ${currencySymbol}${total.toFixed(2)}. ${topCategory?.name} is your top expense. You're averaging ${currencySymbol}${avgDaily.toFixed(2)} per day. Not bad, human.`,
      `Total damage: ${currencySymbol}${total.toFixed(2)} this month. ${topCategory?.name} is eating most of your wallet at ${((topCategory?.value || 0) / total * 100).toFixed(1)}%. Pro tip: maybe ease up there?`
    ];

    return summaries[Math.floor(Math.random() * summaries.length)];
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Analytics</h2>
          <p className="text-slate-400 text-sm">Deep dive into your spending patterns</p>
        </div>
        <button
          onClick={() => setShowBudgetSettings(!showBudgetSettings)}
          className="w-full sm:w-auto px-5 py-3 sm:px-6 bg-violet-500 hover:bg-violet-600 text-white rounded-xl flex items-center justify-center gap-2 transition-colors text-sm font-medium cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          Budget Settings
        </button>
      </div>

      {showBudgetSettings && (
        <BudgetSettings onClose={() => setShowBudgetSettings(false)} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl"
        >
          <h3 className="text-slate-400 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Category Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#fff'
                }}
                formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-6 space-y-2">
            {categoryData.map((cat, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-slate-300 text-sm">{cat.name}</span>
                </div>
                <span className="text-white font-medium">{currencySymbol}{cat.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl"
        >
          <h3 className="text-slate-400 mb-6">Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#fff'
                }}
                formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`}
              />
              <Bar dataKey="amount" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl"
        >
          <h3 className="text-slate-400 mb-6 flex items-center gap-2">
            <Store className="w-5 h-5" />
            Top Merchants
          </h3>
          <div className="space-y-4">
            {topMerchants.map(([merchant, amount], index) => (
              <div key={index} className="flex items-center justify-between p-3 sm:p-4 bg-slate-800/50 rounded-xl gap-2 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-medium text-sm">{index + 1}</span>
                  </div>
                  <span className="text-white font-medium truncate text-sm sm:text-base">{merchant}</span>
                </div>
                <span className="text-violet-400 font-semibold flex-shrink-0 text-sm sm:text-base">{currencySymbol}{amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-pink-500/20 border border-violet-500/30 rounded-3xl p-6 shadow-xl"
        >
          <h3 className="text-slate-300 mb-6 flex items-center gap-2">
            <Brain className="w-5 h-5 text-violet-400" />
            AI Summary
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
              <p className="text-slate-300 leading-relaxed">{generateAISummary()}</p>
            </div>
            <div className="flex items-start gap-3 p-4 bg-violet-500/10 rounded-xl border border-violet-500/20">
              <AlertCircle className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-slate-300">
                <strong className="text-violet-300">Insight:</strong> Your spending pattern shows consistency across the month. Consider setting up automated savings for the surplus.
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl"
      >
        <h3 className="text-slate-400 mb-6">Budget Overview</h3>
        {budgets.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-slate-500 mb-4">No budgets set yet</div>
            <button
              onClick={() => setShowBudgetSettings(true)}
              className="px-6 py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-xl transition-colors"
            >
              Set Your First Budget
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {budgets.map((budget, index) => {
              const percentage = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;
              const status = percentage >= 100 ? 'over' : percentage >= 80 ? 'warning' : 'good';

              return (
                <div key={index} className="p-3 sm:p-4 bg-slate-800/50 rounded-xl min-w-0">
                  <div className="flex items-center justify-between mb-3 gap-2 min-w-0">
                    <span className="text-white font-medium truncate text-sm sm:text-base">{budget.category}</span>
                    <span className="text-slate-400 text-xs sm:text-sm whitespace-nowrap flex-shrink-0">
                      {currencySymbol}{budget.spent.toFixed(2)} / {currencySymbol}{budget.limit.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
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
                  <div className="mt-2 text-sm text-slate-400">
                    {percentage.toFixed(1)}% used
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
