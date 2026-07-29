import { createContext, useContext, useState, useCallback } from "react";
import { authApi } from "../api/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("doubt_tutor_user");
    return stored ? JSON.parse(stored) : null;
  });

  const persistSession = (token, userData) => {
    localStorage.setItem("doubt_tutor_token", token);
    localStorage.setItem("doubt_tutor_user", JSON.stringify(userData));
    setUser(userData);
  };

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login({ email, password });
    persistSession(data.token, data.user);
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { data } = await authApi.register({ name, email, password });
    persistSession(data.token, data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("doubt_tutor_token");
    localStorage.removeItem("doubt_tutor_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
