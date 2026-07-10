import { useCallback, useEffect, useState } from 'react';

const VISIT_KEY = 'mm:visits';
const DISMISS_KEY = 'mm:install-dismissed';
const MIN_VISITS = 3;

/**
 * Add to Home Screen intelligente: cattura `beforeinstallprompt` e mostra
 * il prompt solo dopo almeno MIN_VISITS visite e se non già installato/rifiutato.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    try {
      const visits = Number(localStorage.getItem(VISIT_KEY) || '0') + 1;
      localStorage.setItem(VISIT_KEY, String(visits));
    } catch {
      /* ignore */
    }

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
      let visits = 0;
      let dismissed = false;
      try {
        visits = Number(localStorage.getItem(VISIT_KEY) || '0');
        dismissed = localStorage.getItem(DISMISS_KEY) === '1';
      } catch {
        /* ignore */
      }
      if (visits >= MIN_VISITS && !dismissed) setCanInstall(true);
    };

    const onInstalled = () => {
      setCanInstall(false);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return null;
    deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    setCanInstall(false);
    return choice?.outcome ?? null;
  }, [deferred]);

  const dismiss = useCallback(() => {
    setCanInstall(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  return { canInstall, promptInstall, dismiss };
}
