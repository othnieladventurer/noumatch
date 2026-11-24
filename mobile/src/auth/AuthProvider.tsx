import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import * as authApi from "../api/auth";
import type { Me } from "../api/auth";
import * as session from "./session";

type Status = "loading" | "signedOut" | "signedIn";

type AuthContextValue = {
  user: Me | null;
  status: Status;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const loadProfile = useCallback(async () => {
    const profile = await authApi.me();
    setUser(profile);
    setStatus("signedIn");
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = await session.getAccessToken();
      if (!token) {
        if (!cancelled) setStatus("signedOut");
        return;
      }

      try {
        const profile = await authApi.me();
        if (cancelled) return;
        setUser(profile);
        setStatus("signedIn");
      } catch {
        await session.clearTokens();
        if (!cancelled) setStatus("signedOut");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await authApi.login(email, password);
      await loadProfile();
    },
    [loadProfile],
  );

  const signOut = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setStatus("signedOut");
  }, []);

  const reload = useCallback(async () => {
    try {
      await loadProfile();
    } catch {
      setUser(null);
      setStatus("signedOut");
    }
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, signIn, signOut, reload }),
    [user, status, signIn, signOut, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
