import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { storage } from "@/src/utils/storage";
import { api, TOKEN_KEY, USER_KEY, User } from "@/src/api/client";

type AuthCtx = {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string, adminCode?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);

  const persist = async (token: string, u: User) => {
    await storage.secureSet(TOKEN_KEY, token);
    await storage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  };

  useEffect(() => {
    (async () => {
      const token = await storage.secureGet<string>(TOKEN_KEY, "");
      const raw = await storage.getItem<string>(USER_KEY, "");
      if (token && raw) {
        try {
          setUser(JSON.parse(raw));
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password });
    await persist(res.access_token, res.user);
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string, adminCode?: string) => {
      const res = await api.register({
        name,
        email,
        password,
        admin_code: adminCode || undefined,
      });
      await persist(res.access_token, res.user);
    },
    [],
  );

  const signOut = useCallback(async () => {
    await storage.secureRemove(TOKEN_KEY);
    await storage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const u = await api.me();
      setUser(u);
      await storage.setItem(USER_KEY, JSON.stringify(u));
    } catch {
      await signOut();
    }
  }, [signOut]);

  return (
    <Ctx.Provider value={{ user, isLoading, signIn, signUp, signOut, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
