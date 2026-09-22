"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { apiRequest, setTokens, clearTokens } from "./api";
import type { User, AuthResponse } from "./types";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check if we have stored tokens and restore session
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        clearTokens();
        localStorage.removeItem("user");
      }
    }

    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setTokens(result.accessToken, result.refreshToken);
    localStorage.setItem("user", JSON.stringify(result.user));
    setUser(result.user);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const result = await apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setTokens(result.accessToken, result.refreshToken);
    localStorage.setItem("user", JSON.stringify(result.user));
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem("refreshToken");

    try {
      if (refreshToken) {
        await apiRequest("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {
      // Silently fail — clear local state regardless
    } finally {
      clearTokens();
      localStorage.removeItem("user");
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
