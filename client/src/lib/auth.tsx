import { createContext, useContext, useCallback, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn, clearCsrfToken } from "./queryClient";
import type { User } from "@shared/schema";

type AuthUser = User & {
  tenantName?: string;
  tenantSector?: string;
  tenantSectorGroup?: string;
  tenantSubsector?: string;
  tenantEntityType?: string;
  tenantCountry?: string;
};

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
  scopeCheckToken?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<"success" | "requireTotp">;
  verifyTotp: (code: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  isPlatformAdmin: boolean;
  hasFullAccess: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 60000,
  });

  const loginMutation = useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      return await res.json();
    },
    onSuccess: (data: any) => {
      clearCsrfToken();
      if (!data.requireTotp) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
    },
  });

  const totpVerifyMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/auth/totp-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      await apiRequest("POST", "/api/auth/register", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      clearCsrfToken();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      window.location.href = "/";
    },
  });

  const login = useCallback(
    async (email: string, password: string): Promise<"success" | "requireTotp"> => {
      const data = await loginMutation.mutateAsync({ email, password });
      if (data?.requireTotp) return "requireTotp";
      return "success";
    },
    [loginMutation],
  );

  const verifyTotp = useCallback(
    async (code: string) => {
      await totpVerifyMutation.mutateAsync(code);
    },
    [totpVerifyMutation],
  );

  const register = useCallback(
    async (data: RegisterData) => {
      await registerMutation.mutateAsync(data);
    },
    [registerMutation],
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const isPlatformAdmin = user?.role === "PLATFORM_ADMIN";
  const hasFullAccess = isPlatformAdmin || user?.fullAccessEnabled === true;

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        login,
        verifyTotp,
        register,
        logout,
        isPlatformAdmin,
        hasFullAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
