import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { LOCAL_STORAGE_KEYS } from '../../common';
import type { LoginUser } from '../../common';

interface AuthStore {
  token: string | null;
  user: LoginUser | null;
  clearUser: () => void;
  setAuth: (user: LoginUser, token: string) => void;
  setUser: (user: LoginUser) => void;
}

function getPersistedAuthToken() {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  return localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
}

function persistAuthToken(token: string) {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, token);
}

function clearPersistedAuth() {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_USER);
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: getPersistedAuthToken(),
      user: null,
      clearUser: () => {
        set({ token: null, user: null });
        clearPersistedAuth();
      },
      setAuth: (user, token) => {
        persistAuthToken(token);
        set({ token, user });
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
