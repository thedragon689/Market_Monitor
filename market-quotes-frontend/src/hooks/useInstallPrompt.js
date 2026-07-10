import { useCallback, useEffect, useState } from 'react';
import { isIos, isStandalonePwa, supportsNativeInstall } from '../utils/pwaPlatform';

const VISIT_KEY = 'mm:visits';
const DISMISS_KEY = 'mm:install-dismissed';

/**
 * Installazione PWA:
 * - Android/Chrome: cattura beforeinstallprompt
 * - iOS: mostra guida manuale (Share → Aggiungi a Home)
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [iosGuide, setIosGuide] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    if (isStandalonePwa()) return;

    try {
      const visits = Number(localStorage.getItem(VISIT_KEY) || '0') + 1;
      localStorage.setItem(VISIT_KEY, String(visits));
    } catch {
      /* ignore */
    }

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      /* ignore */
    }
    if (dismissed) return;

    if (isIos()) {
      setIosGuide(true);
      setCanInstall(true);
      return undefined;
    }

    if (!supportsNativeInstall()) return undefined;

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
      setCanInstall(true);
    };

    const onInstalled = () => {
      setCanInstall(false);
      setDeferred(null);
      setIosGuide(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (deferred) {
      deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      setCanInstall(false);
      return choice?.outcome ?? null;
    }
    return null;
  }, [deferred]);

  const dismiss = useCallback(() => {
    setCanInstall(false);
    setIosGuide(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  return {
    canInstall,
    iosGuide,
    hasNativePrompt: Boolean(deferred),
    promptInstall,
    dismiss,
    isStandalone: isStandalonePwa(),
  };
}
