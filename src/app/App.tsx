import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { ExpenseProvider, useExpenseStore } from './store/ExpenseStore';
import { Toaster } from 'sonner';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import Analytics from './components/Analytics';
import Layout from './components/Layout';
import NotificationManager from './components/NotificationManager';

function AppRoutes() {
  const { user } = useExpenseStore();

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