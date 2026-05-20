import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { LOCAL_STORAGE_KEYS } from '../../common';
import type { LoginUser } from '../../common';

interface AuthStore {
  user: LoginUser | null;
  clearUser: () => void;
  setUser: (user: LoginUser) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      clearUser: () => set({ user: null }),
      setUser: (user) => set({ user }),
    }),
    {
      name: LOCAL_STORAGE_KEYS.AUTH_USER,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
