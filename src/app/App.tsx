import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router';
import { ExpenseProvider, useExpenseStore } from './store/ExpenseStore';
import { Toaster } from 'sonner';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import Achievements from './components/Achievements';
import Layout from './components/Layout';
import Login from './components/Login';
import NotificationManager from './components/NotificationManager';

function AppRoutes() {
  const { user, isAuthenticated, isLoading } = useExpenseStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="size-full flex items-center justify-center bg-slate-950">
        <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  if (!user.onboardingComplete) {
    return <Onboarding />;
  }

  return (
    <Layout>
      <NotificationManager />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ExpenseProvider>
        <div className="size-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          <AppRoutes />
          <Toaster position="top-center" theme="dark" />
        </div>
      </ExpenseProvider>
    </BrowserRouter>
  );
}