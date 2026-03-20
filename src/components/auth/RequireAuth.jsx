import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function RequireAuth({ children }) {
  const location = useLocation();
  const { loading, isAuthenticated, authError } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-700/50 bg-slate-900/40 p-8 text-center text-slate-300">
        Checking authentication...
      </div>
    );
  }

  if (authError) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-950/20 p-6 text-center text-red-200">
        {authError}
      </div>
    );
  }

  if (!isAuthenticated) {
    const nextPath = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?next=${encodeURIComponent(nextPath)}`} replace />;
  }

  return children;
}
