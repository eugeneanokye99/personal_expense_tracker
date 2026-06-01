import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Home, BarChart3, Plus, LogOut } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import AddExpenseModal from './AddExpenseModal';
import { useExpenseStore } from '../store/ExpenseStore';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const { logout } = useExpenseStore();

  const tabs = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white select-none">
      {/* Responsive Header */}
      <header className="flex-shrink-0 px-4 py-4 sm:px-6 sm:py-6 border-b border-slate-800/30 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              SpendWisely
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5 hidden sm:block">Track with personality</p>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Desktop Navigation Tabs */}
            <div className="hidden md:flex gap-1 bg-slate-900/50 border border-slate-800/50 rounded-xl p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = location.pathname === tab.path;
                return (
                  <button
                    key={tab.path}
                    onClick={() => navigate(tab.path)}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                      isActive
                        ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium text-sm">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Logout Button (Desktop has text, Mobile has icon only) */}
            <button
              onClick={logout}
              className="p-2.5 sm:px-4 sm:py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 hover:text-red-300 rounded-xl flex items-center gap-2 transition-all font-semibold text-sm cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto pb-24 md:pb-6">
        {children}
      </main>

      {/* Desktop Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowAddExpense(true)}
        className="hidden md:flex fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl shadow-xl shadow-violet-500/30 items-center justify-center hover:shadow-violet-500/50 transition-shadow z-50 cursor-pointer"
      >
        <Plus className="w-6 h-6 text-white" />
      </motion.button>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-lg border-t border-slate-900/40 px-8 py-3 flex items-center justify-around z-40 pb-safe">
        {/* Home Tab */}
        <button
          onClick={() => navigate('/')}
          className={`flex flex-col items-center gap-1 transition-all ${
            location.pathname === '/' ? 'text-violet-400' : 'text-slate-400'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium">Home</span>
        </button>

        {/* Floating Plus Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowAddExpense(true)}
          className="w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full shadow-lg shadow-violet-500/30 flex items-center justify-center -translate-y-5 border-4 border-slate-950"
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.button>

        {/* Analytics Tab */}
        <button
          onClick={() => navigate('/analytics')}
          className={`flex flex-col items-center gap-1 transition-all ${
            location.pathname === '/analytics' ? 'text-violet-400' : 'text-slate-400'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] font-medium">Analytics</span>
        </button>
      </div>

      <AnimatePresence>
        {showAddExpense && (
          <AddExpenseModal onClose={() => setShowAddExpense(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
