import { createContext, useContext } from 'react';
import useLegacyPortfolioAuth from '../hooks/useLegacyPortfolioAuth';
import useAuth0PortfolioAuth from './useAuth0PortfolioAuth';

const PortfolioAuthContext = createContext(null);

const AUTH0_ENABLED = Boolean(
  import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID
);

function LegacyAuthProvider({ children }) {
  const value = useLegacyPortfolioAuth();
  return (
    <PortfolioAuthContext.Provider value={value}>{children}</PortfolioAuthContext.Provider>
  );
}

function Auth0AuthProvider({ children }) {
  const value = useAuth0PortfolioAuth();
  return (
    <PortfolioAuthContext.Provider value={value}>{children}</PortfolioAuthContext.Provider>
  );
}

export function PortfolioAuthProvider({ children }) {
  if (AUTH0_ENABLED) return <Auth0AuthProvider>{children}</Auth0AuthProvider>;
  return <LegacyAuthProvider>{children}</LegacyAuthProvider>;
}

export default function usePortfolioAuth() {
  const ctx = useContext(PortfolioAuthContext);
  if (!ctx) {
    throw new Error('usePortfolioAuth deve essere usato dentro PortfolioAuthProvider');
  }
  return ctx;
}

export { AUTH0_ENABLED };
