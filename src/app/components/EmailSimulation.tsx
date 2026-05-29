import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Sparkles, Check, X } from 'lucide-react';
import { useExpenseStore } from '../store/ExpenseStore';
import { toast } from 'sonner';

interface EmailReceipt {
  id: string;
  from: string;
  subject: string;
  amount: number;
  suggestedCategory: string;
  suggestedTags: string[];
  merchant: string;
  icon: string;
}

const mockEmails: EmailReceipt[] = [
  {
    id: '1',
    from: 'receipts@uber.com',
    subject: 'Your receipt for your trip with Uber',
    amount: 18.50,
    suggestedCategory: 'Transportation',
    suggestedTags: ['ride-share', 'commute'],
    merchant: 'Uber',
    icon: '🚗'
  },
  {
    id: '2',
    from: 'no-reply@airbnb.com',
    subject: 'Reservation confirmed',
    amount: 450.00,
    suggestedCategory: 'Travel',
    suggestedTags: ['accommodation', 'vacation'],
    merchant: 'Airbnb',
    icon: '🏠'
  },
  {
    id: '3',
    from: 'auto-confirm@amazon.com',
    subject: 'Your Amazon.com order has shipped',
    amount: 67.99,
    suggestedCategory: 'Shopping',
    suggestedTags: ['online', 'delivery'],
    merchant: 'Amazon',
    icon: '📦'
  },
  {
    id: '4',
    from: 'receipts@doordash.com',
    subject: 'Your DoorDash receipt',
    amount: 34.25,
    suggestedCategory: 'Food & Dining',
    suggestedTags: ['delivery', 'dinner'],
    merchant: 'DoorDash',
    icon: '🍔'
  }
];

export default function EmailSimulation() {
  const [emails, setEmails] = useState<EmailReceipt[]>(mockEmails);
  const [processing, setProcessing] = useState<string | null>(null);
  const { addExpense } = useExpenseStore();

  const handleConfirm = (email: EmailReceipt) => {
    setProcessing(email.id);

    setTimeout(() => {
      addExpense({
        amount: email.amount,
        category: email.suggestedCategory,
        merchant: email.merchant,
        description: email.subject,
        date: new Date(),
        tags: email.suggestedTags,
        source: 'email'
      });

      toast.success('Expense auto-added from email!', {
        description: `${email.merchant} - $${email.amount.toFixed(2)}`,
        icon: '✉️'
      });

      setEmails(prev => prev.filter(e => e.id !== email.id));
      setProcessing(null);
    }, 800);
  };

  const handleReject = (emailId: string) => {
    setEmails(prev => prev.filter(e => e.id !== emailId));
    toast('Email dismissed', {
      description: 'The expense was not added'
    });
  };

  if (emails.length === 0) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-xl text-center">
        <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Mail className="w-10 h-10 text-slate-600" />
        </div>
        <div className="text-slate-400 mb-2">Inbox all clear!</div>
        <div className="text-slate-500 text-sm">No new receipts to process</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Email Inbox</h3>
            <p className="text-slate-400 text-sm">{emails.length} receipt{emails.length !== 1 ? 's' : ''} to review</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/20 rounded-lg border border-violet-500/30">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-violet-300 text-sm">Auto-parsed</span>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {emails.map((email) => (
            <motion.div
              key={email.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className={`p-4 bg-slate-800/50 rounded-xl border border-slate-700 ${
                processing === email.id ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{email.icon}</div>
                  <div>
                    <div className="text-white font-medium">{email.merchant}</div>
                    <div className="text-slate-400 text-sm">{email.from}</div>
                    <div className="text-slate-500 text-xs mt-1">{email.subject}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold text-lg">${email.amount.toFixed(2)}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="px-3 py-1 bg-violet-500/20 rounded-lg border border-violet-500/30 text-violet-300 text-sm">
                  {email.suggestedCategory}
                </div>
                {email.suggestedTags.map((tag, i) => (
                  <div key={i} className="px-2 py-1 bg-slate-700 rounded text-slate-300 text-xs">
                    #{tag}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleConfirm(email)}
                  disabled={processing === email.id}
                  className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-300 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Confirm
                </button>
                <button
                  onClick={() => handleReject(email.id)}
                  disabled={processing === email.id}
                  className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
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
