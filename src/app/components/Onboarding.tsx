import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Bell, DollarSign, ArrowRight, Sparkles, Calendar, Target } from 'lucide-react';
import { useExpenseStore } from '../store/ExpenseStore';

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'GHS', symbol: '₵', name: 'Ghana Cedi' }
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [budgetResetInterval, setBudgetResetInterval] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [budgetResetDay, setBudgetResetDay] = useState(1);
  const { updateUser } = useExpenseStore();

  const handleComplete = () => {
    updateUser({
      email,
      currency: selectedCurrency,
      emailConnected: true,
      notificationsEnabled: true,
      onboardingComplete: true,
      budgetResetInterval,
      budgetResetDay
    });
  };

  const steps = [
    {
      title: "Welcome to SpendWise",
      subtitle: "Your money, tracked with personality",
      icon: Sparkles,
      content: (
        <div className="space-y-6">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-6 py-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          />
          <input
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-6 py-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          />
        </div>
      )
    },
    {
      title: "Pick Your Currency",
      subtitle: "We'll format everything just right",
      icon: DollarSign,
      content: (
        <div className="grid grid-cols-2 gap-3">
          {currencies.map((currency) => (
            <button
              key={currency.code}
              onClick={() => setSelectedCurrency(currency.code)}
              className={`p-6 rounded-2xl border-2 transition-all ${
                selectedCurrency === currency.code
                  ? 'bg-violet-500/20 border-violet-500 shadow-lg shadow-violet-500/20'
                  : 'bg-slate-800/30 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="text-3xl mb-2">{currency.symbol}</div>
              <div className="text-white font-medium">{currency.code}</div>
              <div className="text-slate-400 text-sm">{currency.name}</div>
            </button>
          ))}
        </div>
      )
    },
    {
      title: "Set Your Budget Cycle",
      subtitle: "Choose how often your budget resets",
      icon: Calendar,
      content: (
        <div className="space-y-6">
          <div>
            <label className="block text-slate-400 text-sm mb-2 font-medium">Reset Cycle</label>
            <select
              value={budgetResetInterval}
              onChange={(e) => setBudgetResetInterval(e.target.value as any)}
              className="w-full px-6 py-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            >
              <option value="weekly">Weekly (Every 7 days)</option>
              <option value="monthly">Monthly (Every month on a set day)</option>
              <option value="quarterly">Quarterly (Every 90 days)</option>
              <option value="yearly">Yearly (Every 365 days)</option>
            </select>
          </div>

          {budgetResetInterval === 'monthly' && (
            <div>
              <label className="block text-slate-400 text-sm mb-2 font-medium">Reset Day of Month (e.g. Pay Day)</label>
              <input
                type="number"
                min="1"
                max="28"
                placeholder="Day of Month (1 - 28)"
                value={budgetResetDay}
                onChange={(e) => setBudgetResetDay(Math.max(1, Math.min(28, parseInt(e.target.value) || 1)))}
                className="w-full px-6 py-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>
          )}
        </div>
      )
    },
    {
      title: "Connect Your Email",
      subtitle: "Auto-track expenses from receipts",
      icon: Mail,
      content: (
        <div className="space-y-4">
          <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-white font-medium">Gmail</div>
                <div className="text-slate-400 text-sm">Scan for receipts automatically</div>
              </div>
            </div>
            <div className="text-slate-300 text-sm">
              We'll parse emails from Uber, Airbnb, Amazon, and more to auto-add your expenses.
            </div>
          </div>
          <div className="text-center text-slate-400 text-sm">
            Don't worry, we only read receipts. Your privacy matters.
          </div>
        </div>
      )
    },
    {
      title: "Enable Notifications",
      subtitle: "Stay on top of your spending",
      icon: Bell,
      content: (
        <div className="space-y-4">
          <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-white font-medium">Budget Alerts</div>
                <div className="text-slate-400 text-sm">Get notified at 80% and when over budget</div>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <div className="text-slate-300">Daily spending summary</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <div className="text-slate-300">Over-budget warnings</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="text-slate-300">Encouraging messages when doing well</div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  return (
    <div className="size-full flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        <div className="mb-8 flex justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-12 bg-violet-500' : 'w-8 bg-slate-700'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-10 shadow-2xl"
          >
            <div className="flex items-center gap-4 mb-2">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">{currentStep.title}</h1>
                <p className="text-slate-400">{currentStep.subtitle}</p>
              </div>
            </div>

            <div className="mt-8">
              {currentStep.content}
            </div>

            <div className="mt-8 flex gap-4">
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-8 py-4 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => {
                  if (step === steps.length - 1) {
                    handleComplete();
                  } else {
                    setStep(step + 1);
                  }
                }}
                disabled={step === 0 && (!email || !password)}
                className="flex-1 px-8 py-4 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {step === steps.length - 1 ? "Let's Go!" : 'Continue'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
