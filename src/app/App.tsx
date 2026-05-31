import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { ExpenseProvider, useExpenseStore } from './store/ExpenseStore';
import { Toaster } from 'sonner';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import Analytics from './components/Analytics';
import Layout from './components/Layout';
import Login from './components/Login';
import NotificationManager from './components/NotificationManager';

function AppRoutes() {
  const { user, isAuthenticated, isLoading } = useExpenseStore();

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