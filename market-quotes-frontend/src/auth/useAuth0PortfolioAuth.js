import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { logoutPortfolio, setPortfolioTokenProvider } from '../utils/portfolioApi';

const MFA_ACR = 'http://schemas.openid.net/pape/policies/2007/06/multi-factor';

export default function useAuth0PortfolioAuth() {
  const {
    isAuthenticated,
    isLoading,
    user: auth0User,
    error: auth0Error,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

  useEffect(() => {
    setPortfolioTokenProvider(async () => {
      if (!isAuthenticated) return null;
      try {
        return await getAccessTokenSilently({
          authorizationParams: audience ? { audience } : undefined,
        });
      } catch {
        return null;
      }
    });
  }, [isAuthenticated, getAccessTokenSilently, audience]);

  useEffect(() => {
    if (auth0Error) setError(auth0Error.message);
  }, [auth0Error]);

  const user = useMemo(() => {
    if (!auth0User) return null;
    return {
      id: auth0User.sub,
      email: auth0User.email,
      emailVerified: auth0User.email_verified,
      name: auth0User.name,
      picture: auth0User.picture,
    };
  }, [auth0User]);

  const login = useCallback(async () => {
    setActionLoading(true);
    setError(null);
    try {
      await loginWithRedirect({
        authorizationParams: {
          ...(audience ? { audience } : {}),
          scope: 'openid profile email',
          ...(import.meta.env.VITE_AUTH0_MFA_ENABLED === 'true'
            ? { acr_values: MFA_ACR }
            : {}),
        },
        appState: { returnTo: '/?view=portfolio' },
      });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [loginWithRedirect, audience]);

  const logout = useCallback(async () => {
    try {
      await logoutPortfolio().catch(() => {});
    } finally {
      await auth0Logout({ logoutParams: { returnTo: window.location.origin } });
    }
  }, [auth0Logout]);

  return {
    mode: 'auth0',
    token: isAuthenticated ? '__auth0__' : null,
    user,
    setUser: () => {},
    setError,
    loading: isLoading || actionLoading,
    error,
    isAuthenticated,
    login,
    register: login,
    loginWithOAuth: null,
    loginWithRedirect: login,
    logout,
    getAccessTokenSilently,
  };
}
