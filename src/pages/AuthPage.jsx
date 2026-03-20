import React, { useMemo } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { storeAuthNextPath } from '../lib/authNavigation';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading, authError, signInWithDiscord } = useAuth();

  const nextPath = useMemo(() => {
    const candidate = searchParams.get('next') || '/zone-tracker';
    if (!candidate.startsWith('/')) return '/zone-tracker';
    return candidate;
  }, [searchParams]);

  if (isAuthenticated && !loading) {
    return <Navigate to={nextPath} replace />;
  }

  return (
    <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-indigo-500/30 bg-slate-900/50 p-8 text-slate-100 shadow-2xl">
      <h1 className="text-2xl font-black uppercase tracking-wide">Zone Tracker Login</h1>
      <p className="mt-3 text-sm text-slate-300">
        Authenticate with Discord to access community zone data and submit runs.
      </p>

      {authError ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-200">
          {authError}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          storeAuthNextPath(nextPath);
          signInWithDiscord();
        }}
        disabled={loading || Boolean(authError)}
        className="mt-6 w-full rounded-xl border border-indigo-400/40 bg-indigo-500/20 px-4 py-3 text-sm font-black uppercase tracking-wide text-indigo-100 transition hover:bg-indigo-500/35 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Continue With Discord
      </button>
    </div>
  );
}
