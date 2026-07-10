import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAuthConfig } from '../../utils/portfolioApi';

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const APPLE_SRC = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

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
 */
export default function PortfolioOAuth({ onOAuth, onError, disabled = false }) {
  const [config, setConfig] = useState(null);
  const [busy, setBusy] = useState(null);
  const googleRef = useRef(null);
  const githubPopupRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchAuthConfig()
      .then((cfg) => {
        if (!cancelled) setConfig(cfg);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Google Identity Services
  useEffect(() => {
    const clientId = config?.oauthClientIds?.google;
    if (!config?.oauth?.google || !clientId || !googleRef.current) return undefined;

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
        /* SDK non caricato */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [config, finishOAuth]);

  // GitHub OAuth popup (authorization code → backend exchange)
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
    const clientId = config?.oauthClientIds?.github;
    if (!clientId || disabled || busy) return;
    const redirectUri = `${window.location.origin}/oauth/github-callback.html`;
    const url =
      `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      '&scope=user:email&state=mm';
    githubPopupRef.current = window.open(url, 'github-oauth', 'width=520,height=640');
  };

  const loginApple = async () => {
    const clientId = config?.oauthClientIds?.apple;
    if (!clientId || disabled || busy) return;
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
  };

  const any =
    config?.oauth?.google || config?.oauth?.github || config?.oauth?.apple;
  if (!any) return null;

  return (
    <div className="portfolio-oauth">
      <p className="portfolio-oauth__divider">
        <span>oppure continua con</span>
      </p>
      <div className="portfolio-oauth__buttons">
        {config.oauth.google && (
          <div
            className={`portfolio-oauth__gsi${busy === 'google' ? ' portfolio-oauth__btn--busy' : ''}`}
            ref={googleRef}
            aria-busy={busy === 'google'}
          />
        )}
        {config.oauth.github && (
          <button
            type="button"
            className="portfolio-oauth__btn portfolio-oauth__btn--github"
            onClick={loginGitHub}
            disabled={disabled || Boolean(busy)}
          >
            {busy === 'github' ? 'Attendere…' : 'GitHub'}
          </button>
        )}
        {config.oauth.apple && (
          <button
            type="button"
            className="portfolio-oauth__btn portfolio-oauth__btn--apple"
            onClick={loginApple}
            disabled={disabled || Boolean(busy)}
          >
            {busy === 'apple' ? 'Attendere…' : 'Apple'}
          </button>
        )}
      </div>
    </div>
  );
}
