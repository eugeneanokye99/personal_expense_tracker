import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useExpenseStore, FUNNY_MESSAGES, ENCOURAGING_MESSAGES } from '../store/ExpenseStore';
import { AlertCircle, TrendingDown, Trophy } from 'lucide-react';

export default function NotificationManager() {
  const { budgets, expenses } = useExpenseStore();
  const notifiedBudgets = useRef<Set<string>>(new Set());

  useEffect(() => {
    budgets.forEach((budget) => {
      const percentage = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;
      const budgetKey = `${budget.category}-${budget.limit}`;

      if (percentage >= 100 && !notifiedBudgets.current.has(`${budgetKey}-over`)) {
        notifiedBudgets.current.add(`${budgetKey}-over`);

        const funnyMessage = FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)];

        toast.error(`Budget Exceeded: ${budget.category}`, {
          description: funnyMessage,
          icon: <AlertCircle className="w-5 h-5" />,
          duration: 6000
        });
      } else if (percentage >= 80 && percentage < 100 && !notifiedBudgets.current.has(`${budgetKey}-warning`)) {
        notifiedBudgets.current.add(`${budgetKey}-warning`);

        toast.warning(`80% Budget Alert: ${budget.category}`, {
          description: `You've used ${percentage.toFixed(1)}% of your budget. Slow down!`,
          icon: <TrendingDown className="w-5 h-5" />,
          duration: 5000
        });
      } else if (percentage < 80) {
        notifiedBudgets.current.delete(`${budgetKey}-warning`);
        notifiedBudgets.current.delete(`${budgetKey}-over`);
      }
    });
  }, [budgets, expenses]);

  useEffect(() => {
    const allUnderBudget = budgets.length > 0 && budgets.every(b => {
      const percentage = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
      return percentage < 80;
    });

    if (allUnderBudget && expenses.length > 0) {
      const shouldShowEncouragement = Math.random() > 0.7;

      if (shouldShowEncouragement) {
        const encouragingMessage = ENCOURAGING_MESSAGES[Math.floor(Math.random() * ENCOURAGING_MESSAGES.length)];

        setTimeout(() => {
          toast.success('Great job on budgeting!', {
            description: encouragingMessage,
            icon: <Trophy className="w-5 h-5" />,
            duration: 4000
          });
        }, 2000);
      }
    }
  }, []);

  return null;
}
