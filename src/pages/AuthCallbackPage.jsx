import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { readAuthNextPath } from '../lib/authNavigation';
import { parseAuthTokensFromUrl } from '../lib/supabaseClient';

export default function AuthCallbackPage() {
  const { completeOAuthFromUrl, isAuthenticated, loading } = useAuth();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Completing Discord sign-in...');
  const [nextPath, setNextPath] = useState('/zone-tracker');

  useEffect(() => {
    let mounted = true;

    async function finishLogin() {
      try {
        setNextPath(readAuthNextPath());
        const hasTokenPayload = Boolean(parseAuthTokensFromUrl(window.location.href)?.access_token);

        if (!hasTokenPayload) {
          if (!loading && isAuthenticated) {
            setStatus('done');
            return;
          }

          throw new Error('No access token found in callback URL.');
        }

        await completeOAuthFromUrl(window.location.href);
        if (!mounted) return;

        setStatus('done');

        const cleanUrl = `${window.location.pathname}`;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch (error) {
        if (!mounted) return;
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Authentication callback failed.');
      }
    }

    finishLogin();

    return () => {
      mounted = false;
    };
  }, [completeOAuthFromUrl, isAuthenticated, loading]);

  if (status === 'done') {
    return <Navigate to={nextPath} replace />;
  }

  return (
    <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-slate-700/50 bg-slate-900/50 p-8 text-slate-100">
      <h1 className="text-xl font-black uppercase tracking-wide">Discord Callback</h1>
      <p className="mt-3 text-sm text-slate-300">{message}</p>
      {status === 'error' ? (
        <Link
          to="/auth"
          className="mt-6 inline-block rounded-lg border border-indigo-400/40 bg-indigo-500/20 px-4 py-2 text-xs font-black uppercase tracking-wide text-indigo-100"
        >
          Back To Login
        </Link>
      ) : null}
    </div>
  );
}
