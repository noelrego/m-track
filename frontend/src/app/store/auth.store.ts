import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { LOCAL_STORAGE_KEYS } from '../../common';
import type { LoginUser } from '../../common';

interface AuthStore {
  user: LoginUser | null;
  clearUser: () => void;
  setUser: (user: LoginUser) => void;
}

function clearPersistedAuthUser() {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_USER);
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      clearUser: () => {
        set({ user: null });
        clearPersistedAuthUser();
      },
      setUser: (user) => set({ user }),
    }),
    {
      name: LOCAL_STORAGE_KEYS.AUTH_USER,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
