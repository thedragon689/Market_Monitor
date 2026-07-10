import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';

/** Pagina callback Auth0 (`/callback`) — senza react-router. */
export default function AuthCallback() {
  const { isLoading, error, isAuthenticated } = useAuth0();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      window.location.replace('/?view=portfolio');
      return;
    }
    if (error) {
      const msg = error.message || 'Autenticazione fallita';
      const dest =
        msg.includes('mfa') || msg.includes('MFA')
          ? '/?view=portfolio&mfa=required'
          : `/?view=portfolio&authError=${encodeURIComponent(msg)}`;
      window.location.replace(dest);
    }
  }, [isLoading, isAuthenticated, error]);

  return (
    <div className="portfolio-auth app-card" style={{ margin: '2rem auto', maxWidth: 420 }}>
      <p>Completamento autenticazione…</p>
      {error && (
        <p className="portfolio-auth__error" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}
