import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Sparkles, Check, X, Square } from 'lucide-react';
import { useExpenseStore, PendingEmail } from '../store/ExpenseStore';
import { toast } from 'sonner';

export default function EmailSimulation() {
  const { pendingEmails, confirmPendingEmail, rejectPendingEmail, user } = useExpenseStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(x => x !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const isAllSelected = pendingEmails.length > 0 && selectedIds.length === pendingEmails.length;

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingEmails.map(e => e.id));
    }
  };

  const handleConfirm = async (email: PendingEmail) => {
    setProcessing(email.id);
    try {
      await confirmPendingEmail(email.id);
      setSelectedIds(prev => prev.filter(x => x !== email.id));
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (emailId: string) => {
    setProcessing(emailId);
    try {
      await rejectPendingEmail(emailId);
      setSelectedIds(prev => prev.filter(x => x !== emailId));
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkConfirm = async () => {
    if (selectedIds.length === 0) return;
    setProcessing('bulk');
    const toastId = toast.loading(`Confirming ${selectedIds.length} transactions...`);
    const totalCount = selectedIds.length;
    let count = 0;
    try {
      // Process sequentially to maintain database session locks cleanly
      for (const id of selectedIds) {
        await confirmPendingEmail(id);
        count++;
      }
      toast.success(`Successfully confirmed ${count} transaction${count > 1 ? 's' : ''}!`, { id: toastId });
      setSelectedIds([]);
    } catch (err) {
      toast.error(`Confirmed ${count} of ${totalCount}. Failed to confirm others.`, { id: toastId });
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkDismiss = async () => {
    if (selectedIds.length === 0) return;
    setProcessing('bulk');
    const toastId = toast.loading(`Dismissing ${selectedIds.length} transactions...`);
    const totalCount = selectedIds.length;
    let count = 0;
    try {
      for (const id of selectedIds) {
        await rejectPendingEmail(id);
        count++;
      }
      toast.success(`Successfully dismissed ${count} transaction${count > 1 ? 's' : ''}!`, { id: toastId });
      setSelectedIds([]);
    } catch (err) {
      toast.error(`Dismissed ${count} of ${totalCount}. Failed to dismiss others.`, { id: toastId });
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
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl h-full flex flex-col select-none">
      
      {/* Dynamic Header / Bulk action toolbar */}
      <AnimatePresence mode="wait">
        {selectedIds.length > 0 ? (
          <motion.div
            key="bulk-toolbar"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between p-3.5 bg-violet-500/10 border border-violet-500/20 rounded-2xl mb-6 gap-3 flex-wrap"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAllToggle}
                className="w-5 h-5 rounded border border-violet-500 bg-violet-500/20 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Deselect All"
              >
                {isAllSelected ? (
                  <Check className="w-3 h-3 stroke-[3]" />
                ) : (
                  <div className="w-2 h-0.5 bg-white rounded-sm" />
                )}
              </button>
              <span className="text-violet-200 text-sm font-semibold">
                {selectedIds.length} of {pendingEmails.length} Selected
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleBulkConfirm}
                disabled={processing !== null}
                className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 hover:border-green-500/40 text-green-300 hover:text-green-200 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Confirm Selected
              </button>
              <button
                onClick={handleBulkDismiss}
                disabled={processing !== null}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/40 text-red-300 hover:text-red-200 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Dismiss Selected
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="normal-header"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center justify-between mb-6"
          >
            <div className="flex items-center gap-3">
              {/* Select All Checkbox */}
              <button
                onClick={handleSelectAllToggle}
                className="w-5 h-5 rounded border border-slate-700 hover:border-slate-500 bg-slate-950/40 text-transparent flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
                title="Select All"
              >
                <Check className="w-3 h-3 stroke-[3]" />
              </button>
              
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2">
                  Parsed Transactions
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm mt-0.5">{pendingEmails.length} pending review</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 rounded-lg border border-violet-500/20">
              <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
              <span className="text-violet-300 text-xs font-medium">Auto-parsed</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable list */}
      <div className="space-y-3 overflow-y-auto max-h-[480px] flex-1 pr-1">
        <AnimatePresence>
          {pendingEmails.map((email) => {
            const isSelected = selectedIds.includes(email.id);
            return (
              <motion.div
                key={email.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                onClick={() => toggleSelect(email.id)}
                className={`p-4 bg-slate-800/20 hover:bg-slate-850/30 rounded-2xl border transition-all flex gap-3.5 items-center cursor-pointer ${
                  processing === email.id || (processing === 'bulk' && isSelected)
                    ? 'opacity-40 pointer-events-none'
                    : ''
                } ${
                  isSelected
                    ? 'bg-violet-500/10 border-violet-500/30 shadow-lg shadow-violet-500/5'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Checkbox Left */}
                <div className="flex-shrink-0">
                  <div
                    className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
                      isSelected
                        ? 'bg-violet-500 border-violet-500 text-white'
                        : 'border-slate-700 hover:border-slate-500 bg-slate-950/40'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                {/* Content Box */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="text-2xl p-2 bg-slate-950/50 rounded-xl flex-shrink-0">
                        {getCategoryIcon(email.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-white font-bold text-sm sm:text-base truncate">{email.merchant}</div>
                        <div className="text-slate-400 text-xs mt-0.5">{email.channel || 'Email'}</div>
                        <div className="text-slate-500 text-[10px] mt-1">Confidence: {email.confidence}%</div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-violet-400 font-extrabold text-base sm:text-lg">
                        {currencySymbol}{email.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    <span className="px-2.5 py-0.5 bg-violet-500/10 rounded-lg border border-violet-500/20 text-violet-300 text-[10px] font-semibold">
                      {email.category}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-900 rounded text-slate-500 text-[9px] font-mono">
                      #auto-parsed
                    </span>
                    <span className="px-2 py-0.5 bg-slate-900 rounded text-slate-500 text-[9px] font-mono">
                      #{email.channel?.toLowerCase().replace(/\s+/g, '-')}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfirm(email);
                      }}
                      disabled={processing !== null}
                      className="flex-1 px-3 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/30 text-green-400 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Confirm
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReject(email.id);
                      }}
                      disabled={processing !== null}
                      className="flex-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Dismiss
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
