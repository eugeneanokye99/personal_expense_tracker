import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Sparkles, Check, X } from 'lucide-react';
import { useExpenseStore, PendingEmail } from '../store/ExpenseStore';

export default function EmailSimulation() {
  const { pendingEmails, confirmPendingEmail, rejectPendingEmail, user } = useExpenseStore();
  const [processing, setProcessing] = useState<string | null>(null);

  const getCategoryIcon = (category: string) => {
    const cats: Record<string, string> = {
      'Food': '🍔',
      'Transport': '🚗',
      'Utilities': '⚡',
      'Health': '🏥',
      'Entertainment': '🎬',
      'Housing': '🏠',
      'Shopping': '📦',
      'Transfers': '💸',
      'Other': '📝'
    };
    return cats[category] || '📝';
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

  const handleConfirm = async (email: PendingEmail) => {
    setProcessing(email.id);
    try {
      await confirmPendingEmail(email.id);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (emailId: string) => {
    setProcessing(emailId);
    try {
      await rejectPendingEmail(emailId);
    } finally {
      setProcessing(null);
    }
  };

  if (pendingEmails.length === 0) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-xl text-center flex flex-col justify-center items-center h-full min-h-[300px]">
        <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
          <Mail className="w-10 h-10 text-slate-600 animate-pulse" />
        </div>
        <div className="text-slate-400 text-lg font-semibold mb-2">Inbox all clear!</div>
        <div className="text-slate-500 text-sm">No parsed MoMo receipts or emails to review right now.</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Parsed Transactions</h3>
            <p className="text-slate-400 text-sm">{pendingEmails.length} pending review</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/20 rounded-lg border border-violet-500/30">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-violet-300 text-sm font-medium">Auto-parsed</span>
        </div>
      </div>

      <div className="space-y-3 overflow-y-auto max-h-[480px] flex-1 pr-1">
        <AnimatePresence>
          {pendingEmails.map((email) => (
            <motion.div
              key={email.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className={`p-4 bg-slate-800/40 rounded-xl border border-slate-800 hover:border-slate-700 transition-all ${
                processing === email.id ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className="text-3xl p-1 bg-slate-900 rounded-xl">
                    {getCategoryIcon(email.category)}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-base">{email.merchant}</div>
                    <div className="text-slate-400 text-sm">{email.channel || 'Email'}</div>
                    <div className="text-slate-500 text-xs mt-1">Confidence score: {email.confidence}%</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-violet-400 font-bold text-lg">
                    {currencySymbol}{email.amount.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="px-3 py-1 bg-violet-500/10 rounded-lg border border-violet-500/20 text-violet-300 text-xs font-semibold">
                  {email.category}
                </div>
                <div className="px-2.5 py-1 bg-slate-800 rounded text-slate-400 text-[10px] font-mono">
                  #auto-parsed
                </div>
                <div className="px-2.5 py-1 bg-slate-800 rounded text-slate-400 text-[10px] font-mono">
                  #{email.channel?.toLowerCase().replace(/\s+/g, '-')}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleConfirm(email)}
                  disabled={processing !== null}
                  className="flex-1 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/30 text-green-400 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Confirm
                </button>
                <button
                  onClick={() => handleReject(email.id)}
                  disabled={processing !== null}
                  className="flex-1 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-all disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Dismiss
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
