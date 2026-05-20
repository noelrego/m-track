import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../shared/api/api-client';
import { clearAuthSession } from '../../shared/auth/auth-session';
import type { SessionResponse } from './home.types';

function HomePage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const userLabel = useMemo(() => {
    if (!session?.user?.username) {
      return 'Signed in';
    }

    return `${session.user.username}${session.user.role ? ` - ${session.user.role}` : ''}`;
  }, [session]);

  useEffect(() => {
    let isMounted = true;

    apiFetch('/me')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Session check failed');
        }

        return (await response.json()) as SessionResponse;
      })
      .then((data) => {
        if (isMounted) {
          setSession(data);
          setStatus('ready');
        }
      })
      .catch(() => {
        clearAuthSession();

        if (isMounted) {
          setStatus('error');
          navigate('/login', { replace: true });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  async function handleLogout() {
    await apiFetch('/logout', { method: 'POST' }).catch(() => undefined);
    clearAuthSession();
    navigate('/login', { replace: true });
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-emerald-300">M-Track</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Home</h1>
          </div>
          <button
            className="w-fit rounded-md border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-emerald-300 hover:text-white"
            onClick={handleLogout}
            type="button"
          >
            Sign out
          </button>
        </header>

        <section className="grid flex-1 place-items-center py-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="w-full max-w-2xl rounded-lg border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/25 sm:p-8"
          >
            <p className="text-sm font-medium text-emerald-300">
              {status === 'loading' ? 'Checking session...' : userLabel}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              Your protected workspace is ready.
            </h2>
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              This page is available after sign-in. Your money tools will live here
              as we build the workspace.
            </p>
            {status === 'ready' ? (
              <div className="mt-6 rounded-md border border-white/10 bg-zinc-950/70 p-4 text-sm text-zinc-300">
                <span className="text-zinc-500">Session:</span> Authenticated
              </div>
            ) : null}
          </motion.div>
        </section>
      </div>
    </main>
  );
}

export default HomePage;
