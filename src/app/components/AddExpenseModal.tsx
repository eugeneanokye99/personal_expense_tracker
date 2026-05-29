import { useState } from 'react';
import { motion } from 'motion/react';
import { X, DollarSign, Tag, Store, Calendar, Hash } from 'lucide-react';
import { useExpenseStore, CATEGORIES } from '../store/ExpenseStore';
import { toast } from 'sonner';

interface AddExpenseModalProps {
  onClose: () => void;
}

export default function AddExpenseModal({ onClose }: AddExpenseModalProps) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [tags, setTags] = useState('');
  const { addExpense } = useExpenseStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !category || !merchant) {
      toast.error('Please fill in all required fields');
      return;
    }

    const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);

    addExpense({
      amount: parseFloat(amount),
      category,
      merchant,
      description,
      date: new Date(date),
      tags: tagArray,
      source: 'manual'
    });

    toast.success('Expense added successfully!', {
      description: `${merchant} - $${parseFloat(amount).toFixed(2)}`
    });

    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Add Expense</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="flex items-center gap-2 text-slate-300 mb-2">
              <DollarSign className="w-4 h-4" />
              Amount *
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-slate-300 mb-2">
              <Tag className="w-4 h-4" />
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              required
            >
              <option value="">Select category</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-slate-300 mb-2">
              <Store className="w-4 h-4" />
              Merchant *
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Where did you spend?"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-slate-300 mb-2">
              <Calendar className="w-4 h-4" />
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-slate-300 mb-2">
              <Hash className="w-4 h-4" />
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="coffee, breakfast, urgent"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full px-6 py-4 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-500/30 transition-all"
          >
            Add Expense
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
