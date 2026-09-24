/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { TOKEN_KEY } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(null);
  // true while we check a saved token with the server (avoids a login-page flash)
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  const saveSession = useCallback((newToken, newUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
  }, []);

  // Restore the session from the saved token (role & name always come from the server).
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    api
      .get("/auth/me")
      .then(({ data }) => active && setUser(data.user))
      .catch((error) => {
        // only a rejected token logs out; a network hiccup keeps the session
        if (active && error?.response?.status === 401) logout();
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.addEventListener("dalouaa:unauthorized", logout);
    return () => window.removeEventListener("dalouaa:unauthorized", logout);
  }, [logout]);

  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post("/auth/login", { email, password });
      saveSession(data.token, data.user);
      return data.user;
    },
    [saveSession]
  );

  const register = useCallback(
    async (payload) => {
      const { data } = await api.post("/auth/register", payload);
      saveSession(data.token, data.user);
      return data.user;
    },
    [saveSession]
  );

  const refreshUser = useCallback(async () => {
    const { data } = await api.get("/auth/me");
    setUser(data.user);
    return data.user;
  }, []);

  // credential = the signed ID token Google gives the browser; the server verifies it
  const loginWithGoogle = useCallback(
    async (credential) => {
      const { data } = await api.post("/auth/google", { credential });
      saveSession(data.token, data.user);
      return data.user;
    },
    [saveSession]
  );

  const updateProfile = useCallback(async (payload) => {
    const { data } = await api.put("/auth/me", payload);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      loginWithGoogle,
      refreshUser,
      logout,
      updateProfile,
      isLoggedIn: Boolean(user),
      isAdmin: user?.role === "ADMIN",
    }),
    [user, token, loading, login, register, loginWithGoogle, refreshUser, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
