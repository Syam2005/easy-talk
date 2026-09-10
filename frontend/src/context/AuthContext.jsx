import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

// Empty string = relative/same-origin. This means fetch('/api/...') automatically
// goes to whatever host the page was loaded from — localhost, your LAN IP, or a
// tunnel URL — with zero rebuilding. Only set VITE_API_URL explicitly if the
// frontend is deployed separately from the backend (e.g. a native app bundle,
// where there's no "same origin" to fall back to).
export const API_URL = import.meta.env.VITE_API_URL || "";

export const api = axios.create({ baseURL: `${API_URL}/api` });

// Distinguishes "the server actually rejected this" from "we couldn't reach the
// server at all" — the second case is a setup problem (wrong API URL, backend
// not running, CORS, mixed HTTP/HTTPS), not a wrong password, and deserves a
// completely different message so people aren't left guessing.
export const getErrorMessage = (err, fallback) => {
  if (err.response) {
    return err.response.data?.message || fallback;
  }
  if (err.request) {
    return API_URL
      ? `Can't reach the server at ${API_URL}. Check VITE_API_URL in frontend/.env, that the backend is running, and that it's reachable from this device.`
      : `Can't reach the server. Make sure the backend is running and serving this page (see README: run "npm run build" in frontend/, then start the backend and open it directly — no separate frontend server needed).`;
  }
  return fallback;
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("et_token") || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      api
        .get("/auth/me")
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem("et_token");
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("et_token", res.data.token);
    api.defaults.headers.common.Authorization = `Bearer ${res.data.token}`;
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (username, email, password) => {
    const res = await api.post("/auth/register", { username, email, password });
    localStorage.setItem("et_token", res.data.token);
    api.defaults.headers.common.Authorization = `Bearer ${res.data.token}`;
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem("et_token");
    delete api.defaults.headers.common.Authorization;
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
