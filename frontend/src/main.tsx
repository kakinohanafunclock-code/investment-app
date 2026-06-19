import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import './index.css';
import Layout from './components/Layout';
import { ToastProvider } from './components/Toast';
import { AuthProvider, useAuth } from './lib/auth';
import SummaryPage from './pages/SummaryPage';
import InputPage from './pages/InputPage';
import StatsPage from './pages/StatsPage';
import AccountsPage from './pages/AccountsPage';
import ReportsPage from './pages/ReportsPage';
import ChatPage from './pages/ChatPage';
import KnowledgePage from './pages/KnowledgePage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';

/** 認証ガード：未ログインは /login へ */
function Protected() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="inline-block w-8 h-8 rounded-full border-[3px] border-accent border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <Protected />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <SummaryPage /> },
          { path: 'input', element: <InputPage /> },
          { path: 'stats', element: <StatsPage /> },
          { path: 'accounts', element: <AccountsPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'chat', element: <ChatPage /> },
          { path: 'knowledge', element: <KnowledgePage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>,
);

// PWA: サービスワーカー登録（本番ビルドのみ）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
