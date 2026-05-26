import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { apiRequest, setAuthToken, getAuthToken, queryClient } from "./queryClient";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  picture: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  loginWithGoogleCredential: (credential: string) => Promise<void>;
  loginWithUsername: (username: string, password: string) => Promise<void>;
  registerWithInvite: (username: string, password: string, inviteCode: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiRequest("GET", "/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setUser({
          id: data.user.userId,
          email: data.user.email,
          name: data.user.name,
          picture: data.user.picture,
        });
      })
      .catch(() => {
        setAuthToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onLogout = () => {
      setUser(null);
      queryClient.clear();
    };
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, []);

  const loginWithGoogleCredential = useCallback(async (credential: string) => {
    const res = await apiRequest("POST", "/api/auth/google", { credential });
    const data = await res.json();
    setAuthToken(data.token);
    setUser(data.user);
    queryClient.clear();
  }, []);

  const loginWithUsername = useCallback(async (username: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { username, password });
    const data = await res.json();
    setAuthToken(data.token);
    setUser(data.user);
    queryClient.clear();
  }, []);

  const registerWithInvite = useCallback(async (username: string, password: string, inviteCode: string) => {
    const res = await apiRequest("POST", "/api/auth/register", { username, password, inviteCode });
    const data = await res.json();
    setAuthToken(data.token);
    setUser(data.user);
    queryClient.clear();
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    queryClient.clear();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogleCredential, loginWithUsername, registerWithInvite, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
