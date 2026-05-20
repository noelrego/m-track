import { AnimatePresence, motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { apiFetch } from '../../shared/api/api-client';
import { DesktopSidebar } from '../navigation/DesktopSidebar';
import { MobileTopBar } from '../navigation/MobileTopBar';

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.clearUser);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    clearUser();

    try {
      await apiFetch('/logout', {
        cache: 'no-store',
        method: 'POST',
      });
    } catch {
      // Local auth cache is still cleared so the user can return to login.
    } finally {
      clearUser();
      navigate('/login', {
        replace: true,
        state: { fromLogout: true },
      });
    }
  }

  return (
    <main className="min-h-screen bg-[#e7a083] p-3 text-zinc-950 sm:p-5 lg:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1480px] overflow-hidden rounded-[30px] bg-[#fbfaf7] shadow-2xl shadow-[#a96049]/25 sm:min-h-[calc(100vh-2.5rem)] lg:min-h-[calc(100vh-4rem)]">
        <DesktopSidebar
          isLoggingOut={isLoggingOut}
          user={user}
          onLogout={handleLogout}
        />

        <section className="flex min-w-0 flex-1 flex-col bg-[#fbfaf7]">
          <MobileTopBar
            isLoggingOut={isLoggingOut}
            user={user}
            onLogout={handleLogout}
          />

          <div className="flex-1 px-5 py-7 sm:px-8 lg:px-16 lg:py-14 xl:px-20">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="min-h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </div>

      <button
        className="sr-only"
        disabled={isLoggingOut}
        onClick={handleLogout}
        type="button"
        aria-label="Sign out"
      >
        <LogOut size={16} />
      </button>
    </main>
  );
}

export default AppShell;
