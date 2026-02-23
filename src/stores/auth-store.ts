import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  name: string;
  email?: string;
  role: string;
  orgId: string;
  avatarUrl?: string;
  locale: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  csrfToken: string | null;
  setUser: (user: User) => void;
  setCsrfToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      csrfToken: null,
      setUser: (user) => set({ user, isAuthenticated: true }),
      setCsrfToken: (csrfToken) => set({ csrfToken }),
      logout: () =>
        set({ user: null, isAuthenticated: false, csrfToken: null }),
    }),
    {
      name: "auth-store",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
