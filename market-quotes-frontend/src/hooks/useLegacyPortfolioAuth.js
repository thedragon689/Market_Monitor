import { useCallback, useEffect, useState } from 'react';
import {
  fetchCurrentUser,
  getPortfolioToken,
  loginPortfolio,
  loginOAuth,
  logoutPortfolio,
  registerPortfolio,
  setPortfolioTokenProvider,
} from '../utils/portfolioApi';

export default function useLegacyPortfolioAuth() {
  const [token, setToken] = useState(getPortfolioToken);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(() => Boolean(getPortfolioToken()));
  const [error, setError] = useState(null);

  useEffect(() => {
    setPortfolioTokenProvider(() => getPortfolioToken());
    const stored = getPortfolioToken();
    setToken(stored);
    if (!stored) {
      setInitializing(false);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCurrentUser();
        if (!cancelled) setUser(data.user);
      } catch {
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password, totpCode) => {
    setLoading(true);
    setError(null);
    try {
      const data = await loginPortfolio(email, password, totpCode);
      setUser(data.user);
      setToken(data.token || data.accessToken);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email, password, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await registerPortfolio(email, password, options);
      setUser(data.user);
      setToken(data.token || data.accessToken);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithOAuth = useCallback(async (provider, payload) => {
    setLoading(true);
    setError(null);
    try {
      const data = await loginOAuth(provider, payload);
      setUser(data.user);
      setToken(data.token || data.accessToken);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutPortfolio();
    } finally {
      setToken(null);
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const data = await fetchCurrentUser();
    setUser(data.user);
    return data.user;
  }, []);

  return {
    mode: 'legacy',
    token,
    user,
    setUser,
    refreshUser,
    setError,
    loading: loading || initializing,
    initializing,
    error,
    isAuthenticated: Boolean(token),
    login,
    register,
    loginWithOAuth,
    loginWithRedirect: null,
    logout,
  };
}
