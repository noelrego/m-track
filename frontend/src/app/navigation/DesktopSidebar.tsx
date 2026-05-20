import { motion } from 'framer-motion';
import { LogOut, WalletCards } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { LoginUser } from '../../common';
import { getDisplayName, getInitials } from '../users/user-display';
import { NAVIGATION_ITEMS } from './navigation.config';

interface DesktopSidebarProps {
  onLogout: () => void;
  user: LoginUser | null;
}

export function DesktopSidebar({ onLogout, user }: DesktopSidebarProps) {
  const displayName = getDisplayName(user);
  const items = NAVIGATION_ITEMS.filter((item) =>
    user ? item.roles.includes(user.role) : false,
  );

  return (
    <aside className="hidden w-[278px] shrink-0 flex-col bg-[#eee5dc] px-8 py-10 md:flex xl:w-[300px] xl:px-10">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-md bg-[#f36f4e] text-white shadow-lg shadow-[#d98066]/30">
          <WalletCards size={21} />
        </div>
        <p className="text-xl font-bold text-zinc-950">SpendWise</p>
      </div>

      <div className="mt-12 flex flex-col items-center text-center">
        <div className="grid size-20 place-items-center rounded-full bg-[#efa482] text-2xl font-bold text-white shadow-xl shadow-[#d98b6c]/30">
          {getInitials(user)}
        </div>
        <p className="mt-5 text-xl font-bold text-zinc-950">{displayName}</p>
        <p className="mt-2 max-w-[190px] truncate text-sm text-zinc-500">
          {user?.emailId ?? 'Signed in'}
        </p>
      </div>

      <nav className="mt-16 flex flex-1 flex-col gap-2">
        {items.map((item) => (
          <NavLink
            className="group relative flex items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold text-zinc-500 transition hover:text-zinc-950"
            key={item.path}
            to={item.path}
          >
            {({ isActive }) => (
              <>
                {isActive ? (
                  <motion.span
                    layoutId="desktop-active-nav"
                    className="absolute inset-0 rounded-md bg-white shadow-lg shadow-zinc-300/30"
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                  />
                ) : null}
                <item.icon
                  className="relative"
                  size={18}
                  strokeWidth={isActive ? 2.6 : 2}
                />
                <span className="relative">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <button
        className="mt-10 flex w-fit items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-500 transition hover:bg-white hover:text-zinc-950"
        onClick={onLogout}
        type="button"
      >
        <span className="grid size-8 place-items-center rounded-full bg-zinc-950 text-white">
          <LogOut size={15} />
        </span>
        Log out
      </button>
    </aside>
  );
}
