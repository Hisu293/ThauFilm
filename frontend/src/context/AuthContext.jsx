import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authService, parseAuthResponse } from '../services/authService';
import { buildListFilmMovies, saveListFilmToStorage } from '../data/listFilmCatalog';

const TOKEN_KEY = 'cinema_token';
const REFRESH_TOKEN_KEY = 'cinema_refresh_token';
const USER_KEY = 'cinema_user';

const AuthContext = createContext(null);

const enrichUser = (userData) => {
  if (!userData || typeof userData !== 'object') return null;

  const email = userData.email ?? '';
  return {
    id: userData.id ?? userData.userId ?? Date.now(),
    name: userData.name ?? userData.fullName ?? userData.username ?? (email ? email.split('@')[0] : 'User'),
    fullName: userData.fullName ?? userData.name ?? '',
    email,
    avatar: userData.avatar ?? null,
    role: userData.role ?? 'user',
    joinedAt: userData.joinedAt ?? new Date().toISOString(),
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      const token = localStorage.getItem(TOKEN_KEY);
      if (!saved || !token) return null;
      return enrichUser(JSON.parse(saved));
    } catch {
      return null;
    }
  });

  const login = useCallback((userData, accessToken, refreshToken) => {
    let resolvedUser = userData;
    let resolvedAccess = accessToken;
    let resolvedRefresh = refreshToken;

    if (userData && typeof userData === 'object' && (userData.accessToken || userData.refreshToken)) {
      const parsed = parseAuthResponse({ data: userData });
      resolvedUser = parsed.user ?? userData;
      resolvedAccess = parsed.accessToken ?? accessToken;
      resolvedRefresh = parsed.refreshToken ?? refreshToken;
    }

    const enriched = enrichUser(resolvedUser);
    if (!enriched) {
      setUser(null);
      return;
    }

    if (resolvedAccess) localStorage.setItem(TOKEN_KEY, resolvedAccess);
    if (resolvedRefresh) localStorage.setItem(REFRESH_TOKEN_KEY, resolvedRefresh);
    localStorage.setItem(USER_KEY, JSON.stringify(enriched));
    saveListFilmToStorage(buildListFilmMovies());
    setUser(enriched);
  }, []);

  useEffect(() => {
    if (user) saveListFilmToStorage(buildListFilmMovies());
  }, [user]);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
      } catch {
        /* vẫn xóa session local nếu API lỗi */
      }
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('cinema_listfilm_catalog');
    localStorage.removeItem('cinema_listfilm_catalog_v2');
    setUser(null);
  }, []);

  const isLoggedIn = Boolean(user);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export default AuthContext;
