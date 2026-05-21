import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../app/store/auth.store";
import type { LoginResponse } from "../../common";
import { apiFetch, getApiErrorMessage } from "../../shared/api/api-client";

function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formSectionRef = useRef<HTMLElement | null>(null);
  const usernameInputRef = useRef<HTMLInputElement | null>(null);

  function scrollToLogin() {
    formSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    window.setTimeout(() => usernameInputRef.current?.focus(), 360);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await apiFetch("/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      const data = (await response.json()) as
        | LoginResponse
        | { message?: string };

      if (!response.ok) {
        setError(getApiErrorMessage(data, "Invalid username or password"));
        return;
      }

      if (!("user" in data) || !data.user) {
        setError("Login succeeded, but user details were missing.");
        return;
      }

      if (!data.token) {
        setError("Login succeeded, but the API did not return a bearer token.");
        return;
      }

      setAuth(data.user, data.token);
      navigate("/home", { replace: true });
    } catch {
      setError("Unable to reach the API. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#09110f] text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative flex min-h-[56vh] items-end overflow-hidden border-b border-white/10 px-5 py-8 sm:order-1 sm:min-h-[42vh] sm:px-10 sm:py-10 lg:min-h-screen lg:items-center lg:border-b-0 lg:border-r lg:px-14">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#0d1f19_0%,#101827_52%,#1f2937_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#09110f] to-transparent" />

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="relative max-w-xl pb-4"
          >
            <p className="text-sm font-semibold uppercase text-emerald-200">
              SpendWise
            </p>
            <h1 className="mt-5 text-4xl font-semibold text-white sm:text-5xl">
              Track today&apos;s spending before it becomes a blur
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-emerald-50/75">
              A private personal finance workspace for daily expense entry,
              monthly insights, category reports, and better spending awareness.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 sm:hidden">
              <button
                className="inline-flex rounded-md bg-emerald-300 px-4 py-3 text-sm font-bold text-zinc-950 transition hover:bg-emerald-200"
                onClick={scrollToLogin}
                type="button"
              >
                Go to login
              </button>
              <Link
                className="inline-flex rounded-md border border-white/15 bg-white/[0.08] px-4 py-3 text-sm font-bold text-white shadow-xl shadow-black/20 backdrop-blur-md transition hover:bg-white/[0.13]"
                to="/about"
              >
                About this app
              </Link>
            </div>
          </motion.div>

          <Link
            className="absolute bottom-10 left-14 z-10 hidden rounded-md border border-white/15 bg-white/[0.08] px-4 py-3 text-sm font-bold text-white shadow-xl shadow-black/20 backdrop-blur-md transition hover:bg-white/[0.13] lg:inline-flex"
            to="/about"
          >
            About this app
          </Link>
        </section>

        <section
          className="order-1 flex items-start justify-center px-5 py-8 sm:order-2 sm:items-center sm:px-8 sm:py-10"
          ref={formSectionRef}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.08 }}
            className="w-full max-w-md"
          >
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 sm:p-8">
              <div>
                <p className="text-sm font-semibold uppercase text-emerald-200 sm:hidden">
                  SpendWise
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white sm:mt-0">
                  Welcome back
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Sign in to record expenses and review your monthly spending.
                </p>
              </div>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="text-sm font-medium text-zinc-200">
                    Username
                  </span>
                  <input
                    ref={usernameInputRef}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    className="mt-2 w-full rounded-md border border-white/10 bg-zinc-950/80 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-300"
                    placeholder="Enter username"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-200">
                    Password
                  </span>
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
                  {isSubmitting ? "Signing in..." : "Sign in"}
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
