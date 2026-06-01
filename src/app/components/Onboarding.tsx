import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Bell, DollarSign, ArrowRight, Sparkles, Calendar, Target } from 'lucide-react';
import { useExpenseStore } from '../store/ExpenseStore';

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GHS', symbol: '₵', name: 'Ghana Cedi' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' }
];

const channelsByCurrency: Record<string, { networks: string[], banks: string[] }> = {
  GHS: {
    networks: ['MTN MoMo', 'Telecel Cash', 'AirtelTigo Money'],
    banks: [
      'GCB Bank',
      'Ecobank Ghana',
      'Fidelity Bank Ghana',
      'Stanbic Bank',
      'Absa Bank Ghana',
      'Standard Chartered Bank',
      'CalBank',
      'Zenith Bank Ghana',
      'Access Bank Ghana',
      'Consolidated Bank Ghana (CBG)',
      'Guaranty Trust Bank (GTBank)',
      'United Bank for Africa (UBA)',
      'Republic Bank Ghana',
      'Agricultural Development Bank (ADB)',
      'First National Bank (FNB)'
    ]
  },
  USD: {
    networks: ['PayPal', 'Venmo', 'CashApp', 'Apple Pay'],
    banks: ['Chase', 'Bank of America', 'Wells Fargo', 'Citibank', 'Capital One']
  },
  EUR: {
    networks: ['PayPal', 'Revolut', 'Wise', 'Apple Pay'],
    banks: ['Deutsche Bank', 'BNP Paribas', 'Société Générale', 'ING Group', 'Santander']
  },
  GBP: {
    networks: ['PayPal', 'Revolut', 'Wise', 'Monzo'],
    banks: ['HSBC', 'Barclays', 'Lloyds Bank', 'NatWest', 'Santander UK']
  },
  DEFAULT: {
    networks: ['PayPal', 'Apple Pay', 'Google Pay', 'Credit Card'],
    banks: ['Local Bank 1', 'Local Bank 2', 'International Bank']
  }
};

const digitalServices = [
  'Spotify',
  'Netflix',
  'Apple Music',
  'YouTube Premium',
  'Amazon Prime',
  'Bolt / Uber',
  'Steam',
  'PlayStation Network',
  'Xbox Live',
  'Google Play Store',
  'Apple App Store',
  'ChatGPT Plus / OpenAI'
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [selectedCurrency, setSelectedCurrency] = useState('GHS');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [budgetResetInterval, setBudgetResetInterval] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [budgetResetDay, setBudgetResetDay] = useState(1);
  const { updateUser, user } = useExpenseStore();

  const handleComplete = () => {
    updateUser({
      currency: selectedCurrency,
      emailConnected: true,
      notificationsEnabled: true,
      onboardingComplete: true,
      budgetResetInterval,
      budgetResetDay,
      selectedChannels
    });
  };

  const getCurrentChannels = () => {
    return channelsByCurrency[selectedCurrency] || channelsByCurrency.DEFAULT;
  };

  const toggleChannel = (channel: string) => {
    setSelectedChannels(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const steps = [
    {
      title: `Welcome, ${user.name || 'Friend'}! 🎉`,
      subtitle: "Let's personalize your SpendWisely profile in 5 quick steps.",
      icon: Sparkles,
      content: (
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-500 rounded-3xl flex items-center justify-center shadow-lg shadow-violet-500/20 mb-2 animate-bounce">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <p className="text-slate-300 text-lg leading-relaxed max-w-md">
            We're thrilled to help you track your spending, manage category budgets, and parse your transactions automatically! Let's get started.
          </p>
        </div>
      )
    },
    {
      title: "Pick Your Currency",
      subtitle: "We'll format everything and customize your options based on this.",
      icon: DollarSign,
      content: (
        <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
          {currencies.map((currency) => (
            <button
              key={currency.code}
              type="button"
              onClick={() => {
                setSelectedCurrency(currency.code);
                setSelectedChannels([]); // Reset selections on currency change
              }}
              className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-start ${
                selectedCurrency === currency.code
                  ? 'bg-violet-500/10 border-violet-500 shadow-lg shadow-violet-500/20'
                  : 'bg-slate-800/30 border-slate-700/60 hover:border-slate-650 hover:bg-slate-800/50'
              }`}
            >
              <div className="text-3xl mb-1.5">{currency.symbol}</div>
              <div className="text-white font-bold text-base">{currency.code}</div>
              <div className="text-slate-400 text-xs text-left">{currency.name}</div>
            </button>
          ))}
        </div>
      )
    },
    {
      title: "Select Accounts & Channels",
      subtitle: "Choose the mobile money networks and banks you use.",
      icon: Target,
      content: (
        <div className="space-y-5 max-h-[320px] overflow-y-auto pr-1">
          {/* Mobile Money / Digital Wallets Section */}
          <div>
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2.5">Mobile Money & Wallets</h4>
            <div className="grid grid-cols-2 gap-2.5">
              {getCurrentChannels().networks.map((network) => {
                const isSelected = selectedChannels.includes(network);
                return (
                  <button
                    key={network}
                    type="button"
                    onClick={() => toggleChannel(network)}
                    className={`p-4 rounded-xl border transition-all text-left flex items-center justify-between ${
                      isSelected
                        ? 'bg-violet-500/10 border-violet-500 text-white font-semibold'
                        : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-sm">{network}</span>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                      isSelected ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-700'
                    }`}>
                      {isSelected && '✓'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Banks Section */}
          <div>
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2.5">Banks & Financial Institutions</h4>
            <div className="grid grid-cols-2 gap-2.5">
              {getCurrentChannels().banks.map((bank) => {
                const isSelected = selectedChannels.includes(bank);
                return (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => toggleChannel(bank)}
                    className={`p-4 rounded-xl border transition-all text-left flex items-center justify-between ${
                      isSelected
                        ? 'bg-violet-500/10 border-violet-500 text-white font-semibold'
                        : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-sm truncate mr-1">{bank}</span>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                      isSelected ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-700'
                    }`}>
                      {isSelected && '✓'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Digital Subscriptions & Services Section */}
          <div>
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2.5">Digital Subscriptions & Services</h4>
            <div className="grid grid-cols-2 gap-2.5">
              {digitalServices.map((service) => {
                const isSelected = selectedChannels.includes(service);
                return (
                  <button
                    key={service}
                    type="button"
                    onClick={() => toggleChannel(service)}
                    className={`p-4 rounded-xl border transition-all text-left flex items-center justify-between ${
                      isSelected
                        ? 'bg-violet-500/10 border-violet-500 text-white font-semibold'
                        : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-sm">{service}</span>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                      isSelected ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-700'
                    }`}>
                      {isSelected && '✓'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
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
              <option value="weekly" className="bg-slate-900 text-white">Weekly (Every 7 days)</option>
              <option value="monthly" className="bg-slate-900 text-white">Monthly (Every month on a set day)</option>
              <option value="quarterly" className="bg-slate-900 text-white">Quarterly (Every 90 days)</option>
              <option value="yearly" className="bg-slate-900 text-white">Yearly (Every 365 days)</option>
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
                <div className="text-white font-medium">Gmail Integration</div>
                <div className="text-slate-400 text-sm">Scan for receipts automatically</div>
              </div>
            </div>
            <div className="text-slate-300 text-sm leading-relaxed">
              We'll securely scan emails from MTN MoMo receipts, Uber, Airbnb, and Amazon to auto-add your expenses.
            </div>
          </div>
          <div className="text-center text-slate-400 text-sm">
            Don't worry, we only read receipts. Your privacy is our priority.
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
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></div>
                <div className="text-slate-300">Daily spending summary & nudge alerts</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <div className="text-slate-300">Over-budget warnings & limits</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="text-slate-300">Funny or encouraging feedback based on your style</div>
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
    <div className="size-full flex items-center justify-center p-6 bg-slate-950">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        <div className="mb-8 flex justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
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
            transition={{ duration: 0.25 }}
            className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-10 shadow-2xl"
          >
            <div className="flex items-center gap-4 mb-2">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Icon className="w-8 h-8 text-white animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">{currentStep.title}</h1>
                <p className="text-slate-400">{currentStep.subtitle}</p>
              </div>
            </div>

            <div className="mt-8 min-h-[220px]">
              {currentStep.content}
            </div>

            <div className="mt-8 flex gap-4">
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-8 py-4 bg-slate-800 text-white rounded-xl hover:bg-slate-750 transition-colors font-medium border border-slate-700"
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
                className="flex-1 px-8 py-4 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-500/30 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
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
