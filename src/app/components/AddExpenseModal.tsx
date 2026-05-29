import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, DollarSign, Tag, Store, Calendar, Hash, FileSpreadsheet, Upload, Check } from 'lucide-react';
import { useExpenseStore, CATEGORIES } from '../store/ExpenseStore';
import { toast } from 'sonner';

interface AddExpenseModalProps {
  onClose: () => void;
}

export default function AddExpenseModal({ onClose }: AddExpenseModalProps) {
  const [mode, setMode] = useState<'manual' | 'momo'>('manual');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { addExpense, uploadStatement } = useExpenseStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !category || !merchant) {
      toast.error('Please fill in all required fields');
      return;
    }

    const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);

    await addExpense({
      amount: parseFloat(amount),
      category,
      merchant,
      description,
      date: new Date(date),
      tags: tagArray,
      source: 'manual'
    });

    onClose();
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setUploading(true);
    try {
      const success = await uploadStatement(file);
      if (success) {
        onClose();
      }
    } finally {
      setUploading(false);
    }
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
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Add Entry</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800/80 mb-6">
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 py-3 text-center text-sm font-medium rounded-xl transition-all ${
              mode === 'manual'
                ? 'bg-slate-850 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Manual Entry
          </button>
          <button
            onClick={() => setMode('momo')}
            className={`flex-1 py-3 text-center text-sm font-medium rounded-xl transition-all ${
              mode === 'momo'
                ? 'bg-slate-850 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            MoMo Statement
          </button>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'manual' ? (
            <motion.form
              key="manual"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
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
                  placeholder="₵0.00"
                  className="w-full px-4 py-3 bg-slate-850 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
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
                  className="w-full px-4 py-3 bg-slate-850 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
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
                  placeholder="E.g., Shoprite, Bolt, ECG"
                  className="w-full px-4 py-3 bg-slate-850 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
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
                  className="w-full px-4 py-3 bg-slate-850 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
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
                  placeholder="groceries, monthly, urgent"
                  className="w-full px-4 py-3 bg-slate-850 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-slate-300 mb-2">
                  Description / Notes
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details about this spend..."
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-850 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full px-6 py-4 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-500/30 active:scale-[0.98] transition-all"
              >
                Save Expense
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="momo"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handleUpload}
              className="space-y-6"
            >
              <div className="text-center bg-slate-950 p-6 rounded-2xl border border-slate-850">
                <FileSpreadsheet className="w-12 h-12 text-violet-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold">Upload MoMo Statement</h3>
                <p className="text-slate-400 text-xs mt-1.5 max-w-sm mx-auto">
                  Drag and drop or select your MTN Mobile Money or Telecel Cash PDF or CSV statement. SpendWisely will parse and categorize it automatically!
                </p>
              </div>

              <div className="relative border-2 border-dashed border-slate-850 hover:border-violet-500/50 rounded-2xl p-8 text-center transition-all bg-slate-950/20">
                <input
                  type="file"
                  accept=".pdf,.csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {file ? (
                  <div className="space-y-2">
                    <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 text-green-500 rounded-xl flex items-center justify-center mx-auto">
                      <Check className="w-5 h-5" />
                    </div>
                    <div className="text-white font-medium text-sm truncate max-w-[300px] mx-auto">{file.name}</div>
                    <div className="text-slate-400 text-xs">{(file.size / 1024).toFixed(1)} KB • PDF or CSV</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-6 h-6 text-slate-500 mx-auto" />
                    <div className="text-slate-400 text-sm font-medium">Click or drag file here</div>
                    <div className="text-slate-500 text-xs">Supports PDF or CSV statements up to 10MB</div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={uploading || !file}
                className="w-full px-6 py-4 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {uploading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  'Upload & Parse Statement'
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
