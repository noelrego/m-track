import { useState } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../app/store/auth.store';
import type { LoginResponse } from '../../common';
import { apiFetch, getApiErrorMessage } from '../../shared/api/api-client';

function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      const data = (await response.json()) as LoginResponse | { message?: string };

      if (!response.ok) {
        setError(getApiErrorMessage(data, 'Invalid username or password'));
        return;
      }

      if (!('user' in data) || !data.user) {
        setError('Login succeeded, but user details were missing.');
        return;
      }

      setUser(data.user);
      navigate('/home', { replace: true });
    } catch {
      setError('Unable to reach the API. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#09110f] text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden min-h-[42vh] items-end overflow-hidden border-b border-white/10 px-6 py-10 sm:order-1 sm:flex sm:px-10 lg:min-h-screen lg:border-b-0 lg:border-r lg:px-14">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#0d1f19_0%,#101827_52%,#1f2937_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#09110f] to-transparent" />

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="relative max-w-xl pb-4"
          >
            <p className="text-sm font-semibold uppercase text-emerald-200">M-Track</p>
            <h1 className="mt-5 text-4xl font-semibold text-white sm:text-5xl">
              Sign in to your money workspace
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-emerald-50/75">
              Track your finances in a private workspace with admin-managed access
              and a clear view of your money.
            </p>
          </motion.div>
        </section>

        <section className="order-1 flex items-start justify-center px-5 py-8 sm:order-2 sm:items-center sm:px-8 sm:py-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: 0.08 }}
            className="w-full max-w-md"
          >
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 sm:p-8">
              <div className="sm:hidden">
                <p className="text-sm font-semibold uppercase text-emerald-200">M-Track</p>
                <h1 className="mt-3 text-3xl font-semibold text-white">
                  Sign in to your money workspace
                </h1>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  Track your finances in a private workspace with admin-managed access.
                </p>
              </div>

              <div className="hidden sm:block">
                <h2 className="text-2xl font-semibold text-white">Welcome back</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Use the username and password created by your admin.
                </p>
              </div>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="text-sm font-medium text-zinc-200">Username</span>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    className="mt-2 w-full rounded-md border border-white/10 bg-zinc-950/80 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-300"
                    placeholder="rootadmin"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-200">Password</span>
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    type="password"
                    className="mt-2 w-full rounded-md border border-white/10 bg-zinc-950/80 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-300"
                    placeholder="Enter password"
                    required
                  />
                </label>

                {error ? (
                  <div className="rounded-md border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                    {error}
                  </div>
                ) : null}

                <button
                  className="w-full rounded-md bg-emerald-300 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}

export default LoginPage;
