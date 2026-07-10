import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import './index.css'
import './accessibility.css'
import './theme/premium-dark.css'
import App from './App.jsx'
import AuthCallback from './components/portfolio/AuthCallback.jsx'
import { ThemeProvider, resolveInitialTheme } from './theme/ThemeProvider'
import { applyDensity, loadDensity } from './hooks/useDensityPreset'
import { OfflineBanner, InstallPrompt, SwUpdatePrompt } from './components/ui'
import { registerSW } from './pwa/registerSW'
import { initWebVitals } from './utils/webVitals'

const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID
const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE
const AUTH0_ENABLED = Boolean(AUTH0_DOMAIN && AUTH0_CLIENT_ID)
const IS_CALLBACK = window.location.pathname === '/callback'

try {
  sessionStorage.removeItem('mm:vite-chunk-reload')
} catch {
  /* ignore */
}

const initialTheme = resolveInitialTheme()
document.documentElement.dataset.theme = initialTheme
document.documentElement.style.colorScheme = initialTheme
applyDensity(loadDensity())

function AppTree() {
  const [swUpdate, setSwUpdate] = useState(false);

  useEffect(() => {
    registerSW({ onUpdate: () => setSwUpdate(true) });
  }, []);

  const reloadApp = () => {
    navigator.serviceWorker?.controller?.postMessage('SKIP_WAITING');
    window.location.reload();
  };

  if (IS_CALLBACK && AUTH0_ENABLED) return <AuthCallback />
  return (
    <>
      <OfflineBanner />
      <App />
      <InstallPrompt />
      {swUpdate ? (
        <SwUpdatePrompt onReload={reloadApp} onDismiss={() => setSwUpdate(false)} />
      ) : null}
    </>
  )
}

const inner = (
  <StrictMode>
    <ThemeProvider defaultTheme={initialTheme}>
      <AppTree />
    </ThemeProvider>
  </StrictMode>
)

createRoot(document.getElementById('root')).render(
  AUTH0_ENABLED ? (
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: `${window.location.origin}/callback`,
        ...(AUTH0_AUDIENCE ? { audience: AUTH0_AUDIENCE } : {}),
        scope: 'openid profile email',
        ...(import.meta.env.VITE_AUTH0_MFA_ENABLED === 'true'
          ? { acr_values: 'http://schemas.openid.net/pape/policies/2007/06/multi-factor' }
          : {}),
      }}
      cacheLocation="localstorage"
      useRefreshTokens
    >
      {inner}
    </Auth0Provider>
  ) : (
    inner
  ),
)

initWebVitals()
