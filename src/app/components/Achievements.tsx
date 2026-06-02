import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Target, TrendingUp, Sparkles, CheckCircle2, Circle, Plus, Coins, Star, Moon, Wallet } from 'lucide-react';
import { useExpenseStore } from '../store/ExpenseStore';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

export default function Achievements() {
  const { expenses, budgets, getTotalSpent, user, unlockedAchievements, unlockAchievement } = useExpenseStore();
  const [savingsGoal, setSavingsGoal] = useState<number>(1000);
  const [savingsProgress, setSavingsProgress] = useState<number>(250);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [newGoal, setNewGoal] = useState<string>('');

  // Load persistent Savings Goals from localStorage on mount
  useEffect(() => {
    const savedGoal = localStorage.getItem(`savings_goal_${user.email}`);
    const savedProgress = localStorage.getItem(`savings_progress_${user.email}`);
    if (savedGoal) setSavingsGoal(Number(savedGoal));
    if (savedProgress) setSavingsProgress(Number(savedProgress));
  }, [user.email]);

  const handleSetGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newGoal);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid savings goal amount');
      return;
    }
    setSavingsGoal(amount);
    localStorage.setItem(`savings_goal_${user.email}`, amount.toString());
    setShowGoalForm(false);
    setNewGoal('');
    toast.success(`Savings goal set to ${currencySymbol}${amount.toFixed(2)}!`);
  };

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount to deposit');
      return;
    }
    const newProgress = savingsProgress + amount;
    setSavingsProgress(newProgress);
    localStorage.setItem(`savings_progress_${user.email}`, newProgress.toString());
    setDepositAmount('');

    // Trigger celebration when goal is reached!
    if (newProgress >= savingsGoal) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
      toast.success("🎉 Milestone Unlocked! You've achieved your savings goal!", {
        description: `Target of ${currencySymbol}${savingsGoal.toFixed(2)} fully funded!`
      });
    } else {
      toast.success(`Added ${currencySymbol}${amount.toFixed(2)} to your savings goal!`);
    }
  };

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

  // --- 8 PERSISTENT DYNAMIC BADGES CALCULATION ---
  
  // 1. Budget Boss: Set >= 3 active budgets
  const activeBudgetsCount = budgets.length;
  const isBudgetBossUnlocked = activeBudgetsCount >= 3;

  // 2. MoMo Master: Count >= 5 email receipts or Mobile Money transactions
  const momoTransactions = expenses.filter(e => 
    e.source === 'email' || 
    (e.tags || []).some(t => t.toLowerCase().includes('momo') || t.toLowerCase().includes('money'))
  ).length;
  const isMoMoMasterUnlocked = momoTransactions >= 5;

  // 3. Super Saver: Spent less than 50% of the total budget limits
  const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = getTotalSpent();
  const isSuperSaverUnlocked = totalBudgetLimit > 0 && totalSpent < (totalBudgetLimit * 0.5);

  // 4. Savings Champion: Completed the Savings Booster target
  const isSavingsChampionUnlocked = savingsProgress >= savingsGoal;

  // 5. Debt Destroyer: Logged >= 3 transfers or debt payback notes
  const transferCount = expenses.filter(e => 
    e.category === 'Transfers' || 
    e.description.toLowerCase().includes('debt') || 
    e.description.toLowerCase().includes('payback')
  ).length;
  const isDebtDestroyerUnlocked = transferCount >= 3;

  // 6. Splurge Survivor: Tracked >= 15 transactions total
  const totalTransactions = expenses.length;
  const isSplurgeSurvivorUnlocked = totalTransactions >= 15;

  // 7. Night Owl Spender: Logged >= 2 after-hours transactions (11 PM - 4 AM)
  const nightTransactions = expenses.filter(e => {
    const hour = new Date(e.date).getHours();
    return hour >= 23 || hour <= 4;
  }).length;
  const isNightOwlSpenderUnlocked = nightTransactions >= 2;

  // 8. Cash King: Logged >= 5 manual cash transactions
  const cashTransactions = expenses.filter(e => e.source === 'manual').length;
  const isCashKingUnlocked = cashTransactions >= 5;

  // Sync unlocked achievements with backend DB
  useEffect(() => {
    const triggerUnlock = async (id: string, name: string) => {
      if (!unlockedAchievements.includes(id)) {
        await unlockAchievement(id);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        toast.success(`🏅 Achievement Unlocked: ${name}!`, {
          description: "This milestone is now permanently saved to your profile in the database!"
        });
      }
    };

    if (isBudgetBossUnlocked) triggerUnlock('budget_boss', 'Budget Boss');
    if (isMoMoMasterUnlocked) triggerUnlock('momo_master', 'MoMo Master');
    if (isSuperSaverUnlocked) triggerUnlock('super_saver', 'Super Saver');
    if (isSavingsChampionUnlocked) triggerUnlock('savings_champion', 'Savings Champion');
    if (isDebtDestroyerUnlocked) triggerUnlock('debt_destroyer', 'Debt Destroyer');
    if (isSplurgeSurvivorUnlocked) triggerUnlock('splurge_survivor', 'Splurge Survivor');
    if (isNightOwlSpenderUnlocked) triggerUnlock('night_owl_spender', 'Night Owl Spender');
    if (isCashKingUnlocked) triggerUnlock('cash_king', 'Cash King');
  }, [
    isBudgetBossUnlocked,
    isMoMoMasterUnlocked,
    isSuperSaverUnlocked,
    isSavingsChampionUnlocked,
    isDebtDestroyerUnlocked,
    isSplurgeSurvivorUnlocked,
    isNightOwlSpenderUnlocked,
    isCashKingUnlocked,
    unlockedAchievements
  ]);

  const badges = [
    {
      id: 'budget_boss',
      title: 'Budget Boss',
      description: 'Set at least 3 active category budgets to organise your limits.',
      requirement: `Category budgets set: ${activeBudgetsCount}/3`,
      progress: (activeBudgetsCount / 3) * 100,
      unlocked: isBudgetBossUnlocked || unlockedAchievements.includes('budget_boss'),
      icon: Target,
      color: 'from-violet-500 to-purple-500'
    },
    {
      id: 'momo_master',
      title: 'MoMo Master',
      description: 'Confirm at least 5 email receipts or Mobile Money transactions.',
      requirement: `Transactions logged: ${momoTransactions}/5`,
      progress: (momoTransactions / 5) * 100,
      unlocked: isMoMoMasterUnlocked || unlockedAchievements.includes('momo_master'),
      icon: Coins,
      color: 'from-amber-500 to-orange-500'
    },
    {
      id: 'super_saver',
      title: 'Super Saver',
      description: 'Keep your active total monthly spending below 50% of your set budget limits.',
      requirement: totalBudgetLimit > 0 
        ? `Spent: ${currencySymbol}${totalSpent.toFixed(0)} / Max: ${currencySymbol}${(totalBudgetLimit * 0.5).toFixed(0)}`
        : 'Set budgets to start this challenge!',
      progress: totalBudgetLimit > 0 ? Math.max(0, Math.min(100, (1 - (totalSpent / totalBudgetLimit)) * 100)) : 0,
      unlocked: isSuperSaverUnlocked || unlockedAchievements.includes('super_saver'),
      icon: Star,
      color: 'from-emerald-500 to-teal-500'
    },
    {
      id: 'savings_champion',
      title: 'Savings Champion',
      description: 'Fully complete your set Savings Challenge Booster goal.',
      requirement: `Progress: ${currencySymbol}${savingsProgress.toFixed(0)} / ${currencySymbol}${savingsGoal.toFixed(0)}`,
      progress: (savingsProgress / savingsGoal) * 100,
      unlocked: isSavingsChampionUnlocked || unlockedAchievements.includes('savings_champion'),
      icon: Trophy,
      color: 'from-pink-500 to-rose-500'
    },
    {
      id: 'debt_destroyer',
      title: 'Debt Destroyer',
      description: 'Log at least 3 transfers or debt payback transactions.',
      requirement: `Transfers logged: ${transferCount}/3`,
      progress: (transferCount / 3) * 100,
      unlocked: isDebtDestroyerUnlocked || unlockedAchievements.includes('debt_destroyer'),
      icon: TrendingUp,
      color: 'from-blue-500 to-indigo-500'
    },
    {
      id: 'splurge_survivor',
      title: 'Splurge Survivor',
      description: 'Track at least 15 transactions to prove your consistent discipline.',
      requirement: `Transactions logged: ${totalTransactions}/15`,
      progress: (totalTransactions / 15) * 100,
      unlocked: isSplurgeSurvivorUnlocked || unlockedAchievements.includes('splurge_survivor'),
      icon: CheckCircle2,
      color: 'from-teal-500 to-cyan-500'
    },
    {
      id: 'night_owl_spender',
      title: 'Night Owl Spender',
      description: 'Log at least 2 after-hours transactions (11 PM - 4 AM). Late night Gob3 cravings?',
      requirement: `Late night spending: ${nightTransactions}/2`,
      progress: (nightTransactions / 2) * 100,
      unlocked: isNightOwlSpenderUnlocked || unlockedAchievements.includes('night_owl_spender'),
      icon: Moon,
      color: 'from-purple-600 to-indigo-900'
    },
    {
      id: 'cash_king',
      title: 'Cash King',
      description: 'Log at least 5 manual cash transactions in SpendWisely.',
      requirement: `Manual entries: ${cashTransactions}/5`,
      progress: (cashTransactions / 5) * 100,
      unlocked: isCashKingUnlocked || unlockedAchievements.includes('cash_king'),
      icon: Wallet,
      color: 'from-amber-600 to-yellow-500'
    }
  ];

  const unlockedCount = badges.filter(b => b.unlocked).length;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            Achievements & Milestones
          </h2>
          <p className="text-slate-400 text-sm">Earn persistent badges, hit key financial milestones, and save securely</p>
        </div>
        <div className="px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center gap-2 self-stretch sm:self-auto text-center justify-center">
          <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
          <span className="text-violet-300 font-semibold text-sm">
            {unlockedCount} / {badges.length} Unlocked
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Savings Goal Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-3 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-pink-500/10 border border-violet-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 z-10 relative">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Savings Challenge Booster</h3>
                <p className="text-slate-400 text-xs sm:text-sm">Set aside surplus and fund your personal savings goals</p>
              </div>
            </div>

            <button
              onClick={() => setShowGoalForm(!showGoalForm)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-750 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Modify Target
            </button>
          </div>

          <AnimatePresence>
            {showGoalForm && (
              <motion.form
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                onSubmit={handleSetGoal}
                className="mb-6 p-4 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-3 overflow-hidden"
              >
                <div className="text-sm font-medium text-white">Set New Savings Challenge Goal</div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-3 text-slate-500 text-sm font-bold">{currencySymbol}</span>
                    <input
                      type="number"
                      placeholder="e.g. 2000"
                      value={newGoal}
                      onChange={(e) => setNewGoal(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Save Target
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center z-10 relative">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-slate-400 text-xs sm:text-sm">Total Saved Toward Goal</span>
                  <div className="text-3xl sm:text-4xl font-black text-white mt-1">
                    {currencySymbol}{savingsProgress.toFixed(2)}{' '}
                    <span className="text-slate-500 text-sm font-normal">/ {currencySymbol}{savingsGoal.toFixed(0)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-violet-400 font-bold text-sm sm:text-base">
                    {((savingsProgress / savingsGoal) * 100).toFixed(0)}%
                  </span>
                  <span className="text-slate-500 text-xs block">Completed</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-slate-950/60 border border-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min((savingsProgress / savingsGoal) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Deposit Form */}
            <div className="lg:col-span-1 p-5 bg-slate-950/40 border border-slate-850 rounded-2xl">
              <form onSubmit={handleDeposit} className="space-y-3">
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider">Fund Savings Goal</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-slate-500 text-xs font-bold">{currencySymbol}</span>
                    <input
                      type="number"
                      placeholder="Deposit"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>

        {/* Dynamic Financial Badges Grid */}
        <div className="md:col-span-3 space-y-4">
          <h3 className="text-slate-450 text-sm font-semibold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-slate-500" />
            Financial Achievements (Persistent in DB)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges.map((badge, index) => {
              const IconComponent = badge.icon;
              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + index * 0.03 }}
                  className={`p-6 rounded-3xl border flex flex-col justify-between transition-all ${
                    badge.unlocked
                      ? 'bg-slate-900/80 border-slate-800 shadow-xl'
                      : 'bg-slate-950/20 border-slate-900/60 opacity-55'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className={`w-12 h-12 bg-gradient-to-br ${badge.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      {badge.unlocked ? (
                        <div className="flex items-center gap-1 text-xs text-green-400 font-bold bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Unlocked
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-slate-500 font-bold bg-slate-850 px-2.5 py-1 rounded-full border border-slate-800">
                          <Circle className="w-3.5 h-3.5" />
                          Locked
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-white font-bold text-base flex items-center gap-1.5">
                        {badge.title}
                      </h4>
                      <p className="text-slate-400 text-xs mt-1.5 leading-relaxed min-h-[48px]">
                        {badge.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-550">
                      <span className="truncate max-w-[70%]">{badge.requirement}</span>
                      <span>{badge.progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                      <div
                        className={`h-full bg-gradient-to-r ${badge.color} transition-all duration-500`}
                        style={{ width: `${Math.min(badge.progress, 100)}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
