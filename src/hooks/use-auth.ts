"use client";

import { useCallback, useMemo } from "react";
import { useAuthStore } from "@/stores/auth-store";
import type { AuthMethod, LoginRequest, LoginResponse } from "@/types/user";

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

interface AuthUser {
  id: string;
  name: string;
  email?: string;
  role: string;
  orgId: string;
  avatarUrl?: string;
  locale: string;
}

interface UseAuthReturn {
  /** Current authenticated user (null if not logged in) */
  user: AuthUser | null;
  /** Whether auth state is still loading */
  isLoading: boolean;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Log in with the given method and credentials */
  login: (method: AuthMethod, credentials: Omit<LoginRequest, "method">) => Promise<void>;
  /** Log out and clear session */
  logout: () => Promise<void>;
  /** Refresh the access token */
  refreshToken: () => Promise<void>;
  /** Error from the last auth operation */
  error: string | null;
}

// ---------------------------------------------------------------------------
// Internal state (module-scoped so it does not cause re-renders)
// ---------------------------------------------------------------------------

let _isLoading = false;
let _error: string | null = null;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): UseAuthReturn {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);
  const setCsrfToken = useAuthStore((s) => s.setCsrfToken);
  const storeLogout = useAuthStore((s) => s.logout);

  const login = useCallback(
    async (
      method: AuthMethod,
      credentials: Omit<LoginRequest, "method">
    ) => {
      _isLoading = true;
      _error = null;

      try {
        const body: LoginRequest = { method, ...credentials };

        const res = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errorBody = await res.json().catch(() => null);
          throw new Error(
            errorBody?.error?.message ?? `Login failed (${res.status})`
          );
        }

        const json = (await res.json()) as { data: LoginResponse };
        const { user: loginUser, csrfToken } = json.data;

        setUser(loginUser);
        setCsrfToken(csrfToken);
      } catch (err) {
        _error = err instanceof Error ? err.message : "Login failed";
        throw err;
      } finally {
        _isLoading = false;
      }
    },
    [setUser, setCsrfToken]
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Best-effort server logout
    } finally {
      storeLogout();
    }
  }, [storeLogout]);

  const refreshToken = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/auth/refresh", { method: "POST" });

      if (!res.ok) {
        // Refresh failed, force logout
        storeLogout();
        return;
      }

      const json = await res.json();
      if (json.data?.csrfToken) {
        setCsrfToken(json.data.csrfToken);
      }
    } catch {
      storeLogout();
    }
  }, [setCsrfToken, storeLogout]);

  return useMemo(
    () => ({
      user,
      isLoading: _isLoading,
      isAuthenticated,
      login,
      logout,
      refreshToken,
      error: _error,
    }),
    [user, isAuthenticated, login, logout, refreshToken]
  );
}
