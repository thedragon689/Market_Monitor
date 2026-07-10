import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchAuthConfig } from '../../utils/portfolioApi';
import { resolveOAuthConfig } from '../../utils/portfolioOAuthConfig';

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const APPLE_SRC = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

const PROVIDER_LABELS = {
  google: 'Google',
  github: 'GitHub',
  apple: 'Apple',
};

function GoogleIcon() {
  return (
    <svg className="portfolio-oauth__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="portfolio-oauth__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.84 1.236 1.84 1.236 1.07 1.834 2.807 1.304 3.492.997.108-.776.418-1.305.762-1.604-2.665-.303-5.466-1.332-5.466-5.93 0-1.31.468-2.38 1.236-3.22-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.5 11.5 0 0 1 3.003-.404c1.018.005 2.045.138 3.003.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.652.242 2.873.118 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.604-.015 2.896-.015 3.286 0 .315.21.694.825.576C20.565 21.796 24 17.297 24 12 24 5.37 18.63 0 12 0z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="portfolio-oauth__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.365 1.43c0 1.14-.42 2.19-1.193 2.985-.853.89-2.042 1.41-3.247 1.33-.15-1.1.45-2.26 1.23-3.01.84-.81 2.28-1.39 3.21-1.305zm1.17 3.08c-2.9-.17-5.36 1.64-6.75 1.64-1.4 0-3.56-1.59-5.87-1.55-3.02.05-5.8 1.76-7.35 4.48-3.14 5.45-.81 13.52 2.25 17.95 1.5 2.17 3.29 4.6 5.64 4.51 2.27-.09 3.13-1.47 5.87-1.47 2.73 0 3.5 1.47 5.89 1.42 2.43-.05 3.97-2.19 5.46-4.37 1.72-2.51 2.43-4.95 2.47-5.07-.05-.02-4.75-1.82-4.8-7.23-.04-4.53 3.7-6.7 3.86-6.83-2.1-3.08-5.37-3.41-6.51-3.48z"
      />
    </svg>
  );
}

function loadScript(src, id) {
  if (document.getElementById(id)) {
    return document.getElementById(id).dataset.loaded === '1'
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
          const el = document.getElementById(id);
          el.addEventListener('load', () => resolve(), { once: true });
          el.addEventListener('error', () => reject(new Error(`Script ${id} fallito`)), {
            once: true,
          });
        });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.id = id;
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = () => {
      s.dataset.loaded = '1';
      resolve();
    };
    s.onerror = () => reject(new Error(`Script ${id} fallito`));
    document.head.appendChild(s);
  });
}

/**
 * Pulsanti OAuth (Google, GitHub, Apple) per login/registrazione portfolio.
 * I pulsanti sono sempre visibili; il login funziona solo se il provider è configurato sul server.
 */
export default function PortfolioOAuth({ onOAuth, onError, disabled = false }) {
  const [apiConfig, setApiConfig] = useState(undefined);
  const [busy, setBusy] = useState(null);
  const googleRef = useRef(null);
  const githubPopupRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchAuthConfig()
      .then((cfg) => {
        if (!cancelled) setApiConfig(cfg ?? null);
      })
      .catch(() => {
        if (!cancelled) setApiConfig(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resolved = useMemo(() => resolveOAuthConfig(apiConfig), [apiConfig]);
  const googleReady = Boolean(resolved.oauth.google && resolved.oauthClientIds.google);

  const finishOAuth = useCallback(
    async (provider, payload) => {
      if (!onOAuth) return;
      setBusy(provider);
      try {
        await onOAuth(provider, payload);
      } catch (err) {
        onError?.(err.message || 'Accesso social fallito');
      } finally {
        setBusy(null);
      }
    },
    [onOAuth, onError]
  );

  const guardProvider = useCallback(
    (provider, clientId, action) => {
      if (disabled || busy) return;
      if (!clientId) {
        onError?.(
          `Accesso ${PROVIDER_LABELS[provider]} non attivo. Configura le credenziali OAuth su Netlify (GOOGLE_CLIENT_ID, GITHUB_CLIENT_ID/SECRET, APPLE_CLIENT_ID).`
        );
        return;
      }
      action();
    },
    [busy, disabled, onError]
  );

  useEffect(() => {
    const clientId = resolved.oauthClientIds?.google;
    if (!googleReady || !clientId || !googleRef.current) return undefined;

    let cancelled = false;
    (async () => {
      try {
        await loadScript(GSI_SRC, 'gsi-client');
        if (cancelled || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response?.credential) {
              finishOAuth('google', { token: response.credential });
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        googleRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: 280,
          locale: 'it',
        });
      } catch {
        /* SDK non caricato — resta il pulsante fallback */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [googleReady, resolved.oauthClientIds?.google, finishOAuth]);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'github-oauth') return;
      githubPopupRef.current?.close?.();
      githubPopupRef.current = null;
      if (event.data.error) {
        onError?.(event.data.error);
        return;
      }
      if (event.data.code) {
        finishOAuth('github', {
          code: event.data.code,
          redirectUri: `${window.location.origin}/oauth/github-callback.html`,
        });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [finishOAuth, onError]);

  const loginGitHub = () => {
    const clientId = resolved.oauthClientIds?.github;
    guardProvider('github', clientId, () => {
      const redirectUri = `${window.location.origin}/oauth/github-callback.html`;
      const url =
        `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        '&scope=user:email&state=mm';
      githubPopupRef.current = window.open(url, 'github-oauth', 'width=520,height=640');
    });
  };

  const loginApple = async () => {
    const clientId = resolved.oauthClientIds?.apple;
    guardProvider('apple', clientId, async () => {
      setBusy('apple');
      try {
        await loadScript(APPLE_SRC, 'apple-auth');
        if (!window.AppleID?.auth) throw new Error('Apple Sign In non disponibile');

        window.AppleID.auth.init({
          clientId,
          scope: 'name email',
          redirectURI: window.location.origin,
          usePopup: true,
        });

        const res = await window.AppleID.auth.signIn();
        const idToken = res?.authorization?.id_token;
        if (!idToken) throw new Error('Token Apple mancante');
        await finishOAuth('apple', { token: idToken });
      } catch (err) {
        if (err?.error !== 'popup_closed_by_user') {
          onError?.(err?.message || err?.error || 'Accesso Apple fallito');
        }
        setBusy(null);
      }
    });
  };

  return (
    <div className="portfolio-oauth">
      <p className="portfolio-oauth__divider">
        <span>oppure continua con</span>
      </p>
      <div className="portfolio-oauth__buttons">
        {googleReady ? (
          <div
            className={`portfolio-oauth__gsi${busy === 'google' ? ' portfolio-oauth__btn--busy' : ''}`}
            ref={googleRef}
            aria-busy={busy === 'google'}
            aria-label="Continua con Google"
          />
        ) : (
          <button
            type="button"
            className="portfolio-oauth__btn portfolio-oauth__btn--google"
            onClick={() => guardProvider('google', resolved.oauthClientIds?.google, () => {})}
            disabled={disabled || Boolean(busy)}
            aria-busy={busy === 'google'}
          >
            <GoogleIcon />
            {busy === 'google' ? 'Attendere…' : 'Google'}
          </button>
        )}
        <button
          type="button"
          className="portfolio-oauth__btn portfolio-oauth__btn--github"
          onClick={loginGitHub}
          disabled={disabled || Boolean(busy)}
          aria-busy={busy === 'github'}
        >
          <GitHubIcon />
          {busy === 'github' ? 'Attendere…' : 'GitHub'}
        </button>
        <button
          type="button"
          className="portfolio-oauth__btn portfolio-oauth__btn--apple"
          onClick={loginApple}
          disabled={disabled || Boolean(busy)}
          aria-busy={busy === 'apple'}
        >
          <AppleIcon />
          {busy === 'apple' ? 'Attendere…' : 'Apple'}
        </button>
      </div>
    </div>
  );
}
