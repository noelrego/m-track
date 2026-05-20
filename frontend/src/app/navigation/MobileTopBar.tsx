import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Menu, WalletCards, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import type { LoginUser } from '../../common';
import { getDisplayName, getInitials } from '../users/user-display';
import { NAVIGATION_ITEMS } from './navigation.config';

interface MobileTopBarProps {
  onLogout: () => void;
  user: LoginUser | null;
}

export function MobileTopBar({ onLogout, user }: MobileTopBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const displayName = getDisplayName(user);
  const items = NAVIGATION_ITEMS.filter((item) =>
    user ? item.roles.includes(user.role) : false,
  );

  return (
    <>
      <header className="flex items-center justify-between border-b border-zinc-200/80 px-4 py-4 md:hidden">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-md bg-[#f36f4e] text-white">
            <WalletCards size={19} />
          </div>
          <p className="text-lg font-bold text-zinc-950">SpendWise</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-full bg-[#efa482] text-xs font-bold text-white">
              {getInitials(user)}
            </div>
            <p className="max-w-[90px] truncate text-xs font-semibold text-zinc-700">
              {displayName}
            </p>
          </div>
          <button
            className="grid size-10 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-950"
            onClick={() => setIsOpen(true)}
            type="button"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isOpen ? (
          <>
            <motion.button
              className="fixed inset-0 z-40 bg-zinc-950/35 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              type="button"
              aria-label="Close navigation backdrop"
            />
            <motion.aside
              className="fixed inset-y-0 right-0 z-50 flex w-[70vw] min-w-[270px] max-w-[340px] flex-col bg-[#eee5dc] px-6 py-6 shadow-2xl shadow-zinc-950/30 md:hidden"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.26, ease: 'easeOut' }}
            >
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-zinc-950">SpendWise</p>
                <button
                  className="grid size-9 place-items-center rounded-md bg-white text-zinc-950"
                  onClick={() => setIsOpen(false)}
                  type="button"
                  aria-label="Close navigation"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-9">
                <div className="grid size-16 place-items-center rounded-full bg-[#efa482] text-xl font-bold text-white">
                  {getInitials(user)}
                </div>
                <p className="mt-4 text-lg font-bold text-zinc-950">{displayName}</p>
                <p className="mt-1 truncate text-sm text-zinc-500">
                  {user?.emailId ?? 'Signed in'}
                </p>
              </div>

              <nav className="mt-10 flex flex-1 flex-col gap-2">
                {items.map((item) => (
                  <NavLink
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold transition',
                        isActive
                          ? 'bg-white text-zinc-950 shadow-lg shadow-zinc-300/30'
                          : 'text-zinc-500 hover:bg-white/70 hover:text-zinc-950',
                      ].join(' ')
                    }
                    key={item.path}
                    onClick={() => setIsOpen(false)}
                    to={item.path}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <button
                className="mt-8 flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-zinc-600 transition hover:bg-white hover:text-zinc-950"
                onClick={onLogout}
                type="button"
              >
                <span className="grid size-8 place-items-center rounded-full bg-zinc-950 text-white">
                  <LogOut size={15} />
                </span>
                Log out
              </button>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
