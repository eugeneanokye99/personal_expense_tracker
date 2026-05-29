import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Home, BarChart3, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AddExpenseModal from './AddExpenseModal';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showAddExpense, setShowAddExpense] = useState(false);

  const tabs = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' }
  ];

  return (
    <div className="size-full flex flex-col">
      <header className="flex-shrink-0 px-6 py-6 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              SpendWise
            </h1>
            <p className="text-slate-400 text-sm mt-1">Track with personality</p>
          </div>
          <div className="flex gap-2 bg-slate-800/50 rounded-2xl p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = location.pathname === tab.path;
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className={`px-6 py-3 rounded-xl flex items-center gap-2 transition-all ${
                    isActive
                      ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        {children}
      </main>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowAddExpense(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl shadow-2xl shadow-violet-500/40 flex items-center justify-center hover:shadow-violet-500/60 transition-shadow z-50"
      >
        <Plus className="w-8 h-8 text-white" />
      </motion.button>

      <AnimatePresence>
        {showAddExpense && (
          <AddExpenseModal onClose={() => setShowAddExpense(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
