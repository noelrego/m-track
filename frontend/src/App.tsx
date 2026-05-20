import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';

type AuthTransport = 'bearer' | 'cookie' | 'both';

interface LoginResponse {
  accessToken?: string;
  tokenType: string;
  expiresIn: string;
  authTransport: AuthTransport;
}

interface SessionResponse {
  user?: {
    username?: string;
    emailId?: string;
    role?: string;
    isRootAdmin?: boolean;
  };
}

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const apiPrefix = import.meta.env.VITE_API_PREFIX ?? 'api';
const authTransport = (import.meta.env.VITE_AUTH_TRANSPORT ?? 'cookie') as AuthTransport;
const authStorageKey = 'm_track_authenticated';
const tokenStorageKey = 'm_track_access_token';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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

      if (shouldUseBearerOnClient() && 'accessToken' in data && data.accessToken) {
        sessionStorage.setItem(tokenStorageKey, data.accessToken);
      }

      sessionStorage.setItem(authStorageKey, 'true');
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
        <section className="relative flex min-h-[42vh] items-end overflow-hidden border-b border-white/10 px-6 py-10 sm:px-10 lg:min-h-screen lg:border-b-0 lg:border-r lg:px-14">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#0d1f19_0%,#101827_52%,#1f2937_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#09110f] to-transparent" />

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="relative max-w-xl pb-4"
          >
            <p className="text-sm font-semibold uppercase text-emerald-200">
              M-Track
            </p>
            <h1 className="mt-5 text-4xl font-semibold text-white sm:text-5xl">
              Sign in to your money workspace
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-emerald-50/75">
              Track your finances in a private workspace with admin-managed access
              and a clear view of your money.
            </p>
          </motion.div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: 0.08 }}
            className="w-full max-w-md"
          >
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 sm:p-8">
              <div>
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = sessionStorage.getItem(authStorageKey) === 'true';

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

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
        sessionStorage.removeItem(authStorageKey);
        sessionStorage.removeItem(tokenStorageKey);

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
    sessionStorage.removeItem(authStorageKey);
    sessionStorage.removeItem(tokenStorageKey);
    navigate('/login', { replace: true });
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-emerald-300">
              M-Track
            </p>
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

function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = sessionStorage.getItem(tokenStorageKey);

  if (shouldUseBearerOnClient() && token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(buildApiUrl(path), {
    ...init,
    headers,
    credentials: 'include',
  });
}

function buildApiUrl(path: string) {
  const baseUrl = apiUrl.replace(/\/+$/g, '');
  const prefix = apiPrefix.replace(/^\/+|\/+$/g, '');
  const route = path.replace(/^\/+/g, '');

  return [baseUrl, prefix, route].filter(Boolean).join('/');
}

function shouldUseBearerOnClient() {
  return authTransport === 'bearer' || authTransport === 'both';
}

function getApiErrorMessage(data: unknown, fallback: string) {
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const message = (data as { message?: unknown }).message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  return fallback;
}

export default App;
