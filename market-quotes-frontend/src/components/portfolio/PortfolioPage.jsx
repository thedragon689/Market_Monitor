import { useCallback, useEffect, useRef, useState } from 'react';
import { PortfolioAuthProvider } from '../../auth/PortfolioAuthProvider';
import usePortfolioAuth from '../../hooks/usePortfolioAuth';
import {
  addPortfolioAsset,
  addPortfolioTransaction,
  fetchPortfolioAsset,
  fetchPortfolioDashboard,
  fetchPortfolioHistory,
  resendEmailVerification,
  verifyEmailToken,
} from '../../utils/portfolioApi';
import PortfolioAddAsset from './PortfolioAddAsset';
import PortfolioAssetDetail from './PortfolioAssetDetail';
import PortfolioAuth from './PortfolioAuth';
import PortfolioDashboard from './PortfolioDashboard';
import PortfolioNotifications from './PortfolioNotifications';
import PortfolioInsights from './PortfolioInsights';

export default function PortfolioPage(props) {
  return (
    <PortfolioAuthProvider>
      <PortfolioPageInner {...props} />
    </PortfolioAuthProvider>
  );
}

function PortfolioPageInner({ onSelectAsset }) {
  const auth = usePortfolioAuth();
  const [subView, setSubView] = useState('dashboard');
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyRange, setHistoryRange] = useState('1M');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [assetDetail, setAssetDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const initialLoadDone = useRef(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [txError, setTxError] = useState(null);
  const [verifyNotice, setVerifyNotice] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('verifyEmail');
    if (!token) return undefined;

    let cancelled = false;
    (async () => {
      try {
        await verifyEmailToken(token);
        if (!cancelled) {
          setVerifyNotice('Email verificata con successo.');
          auth.setUser((u) => (u ? { ...u, emailVerified: true } : u));
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Verifica email fallita');
      } finally {
        params.delete('verifyEmail');
        const qs = params.toString();
        const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
        window.history.replaceState({}, '', next);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadHistory = useCallback(async (range = historyRange, { silent = false } = {}) => {
    if (!auth.token) return;
    if (!silent) setHistoryLoading(true);
    try {
      const data = await fetchPortfolioHistory(range);
      setHistory(data.history ?? []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [auth.token, historyRange]);

  const loadDashboard = useCallback(async (silent = false) => {
    if (!auth.token) return;
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await fetchPortfolioDashboard();
      setDashboard(data);
      return data;
    } catch (err) {
      if (err.message?.includes('503') || err.message?.includes('non disponibile')) {
        setError('Portfolio non configurato sul server. Imposta DATABASE_URL (NeonDB).');
      } else if (err.message?.includes('401') || err.message?.includes('Autenticazione')) {
        auth.logout();
      } else {
        setError(err.message);
      }
      return null;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth]);

  const loadInitialDashboard = useCallback(async () => {
    if (!auth.token) return;
    setLoading(true);
    setHistoryLoading(true);
    setError(null);
    try {
      const [dash, hist] = await Promise.all([
        fetchPortfolioDashboard(),
        fetchPortfolioHistory(historyRange),
      ]);
      setDashboard(dash);
      setHistory(hist.history ?? []);
      setReady(true);
      initialLoadDone.current = true;
    } catch (err) {
      if (err.message?.includes('503') || err.message?.includes('non disponibile')) {
        setError('Portfolio non configurato sul server. Imposta DATABASE_URL (NeonDB).');
      } else if (err.message?.includes('401') || err.message?.includes('Autenticazione')) {
        auth.logout();
      } else {
        setError(err.message);
      }
      setReady(true);
      initialLoadDone.current = true;
    } finally {
      setLoading(false);
      setHistoryLoading(false);
    }
  }, [auth.token, auth.logout, historyRange]);

  const loadDetail = useCallback(
    async (symbol) => {
      if (!auth.token || !symbol) return;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPortfolioAsset(symbol);
        setAssetDetail(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [auth.token]
  );

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setReady(false);
      initialLoadDone.current = false;
      setDashboard(null);
      setHistory([]);
      return;
    }
    if (subView !== 'dashboard') return;
    if (!initialLoadDone.current) {
      loadInitialDashboard();
    }
  }, [auth.isAuthenticated, subView, loadInitialDashboard]);

  useEffect(() => {
    if (auth.isAuthenticated && subView === 'detail' && selectedSymbol) {
      loadDetail(selectedSymbol);
    }
  }, [auth.isAuthenticated, subView, selectedSymbol, loadDetail]);

  const handleAddAsset = async (payload) => {
    if (payload?.error) {
      setError(payload.error);
      return;
    }
    setSubmitLoading(true);
    setError(null);
    try {
      await addPortfolioAsset(payload);
      setSubView('dashboard');
      await loadDashboard();
      await loadHistory(historyRange);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAddTransaction = async (payload) => {
    setSubmitLoading(true);
    setTxError(null);
    try {
      await addPortfolioTransaction({
        symbol: selectedSymbol,
        assetType: assetDetail?.assetType,
        ...payload,
      });
      await loadDetail(selectedSymbol);
      await loadDashboard(true);
      await loadHistory(historyRange);
    } catch (err) {
      setTxError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleHistoryRange = (range) => {
    setHistoryRange(range);
    if (initialLoadDone.current) {
      loadHistory(range);
    }
  };

  if (!auth.isAuthenticated) {
    return (
      <div className="portfolio-page">
        <PortfolioAuth auth={auth} onSuccess={() => setSubView('dashboard')} />
      </div>
    );
  }

  if (subView === 'notify') {
    return (
      <div className="portfolio-page">
        <PortfolioNotifications onBack={() => setSubView('dashboard')} />
      </div>
    );
  }

  if (subView === 'add') {
    return (
      <div className="portfolio-page">
        <PortfolioAddAsset
          onBack={() => setSubView('dashboard')}
          onSubmit={handleAddAsset}
          loading={submitLoading}
          error={error}
        />
      </div>
    );
  }

  if (subView === 'detail') {
    return (
      <div className="portfolio-page">
        <PortfolioAssetDetail
          asset={assetDetail}
          loading={loading}
          onBack={async () => {
            setSubView('dashboard');
            setSelectedSymbol(null);
            await loadDashboard(true);
          }}
          onAddTransaction={handleAddTransaction}
          onAlertsUpdated={() => loadDetail(selectedSymbol)}
          txLoading={submitLoading}
          txError={txError}
        />
      </div>
    );
  }

  return (
    <div className="portfolio-page">
      {verifyNotice && (
        <p className="portfolio-page__notice" role="status">
          {verifyNotice}
        </p>
      )}
      {auth.user?.emailVerified === false && (
        <div className="portfolio-page__verify-banner" role="status">
          <span>Verifica la tua email per proteggere l&apos;account.</span>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() =>
              resendEmailVerification()
                .then(() => setVerifyNotice('Link di verifica inviato.'))
                .catch((err) => setError(err.message))
            }
          >
            Reinvia link
          </button>
        </div>
      )}
      <header className="portfolio-page__head">
        <div className="portfolio-page__intro">
          <h1 className="portfolio-page__title">Portfolio</h1>
          <p className="portfolio-page__lead">
            Gestisci posizioni, transazioni e monitora P/L in tempo reale.
          </p>
        </div>
        <button type="button" className="btn btn--ghost btn--small" onClick={auth.logout}>
          Esci
        </button>
      </header>

      {error && (
        <p className="portfolio-auth__error app-card" role="alert">
          {error}
        </p>
      )}

      <PortfolioDashboard
        dashboard={dashboard}
        history={history}
        historyRange={historyRange}
        onHistoryRangeChange={handleHistoryRange}
        historyLoading={historyLoading}
        ready={ready}
        refreshing={refreshing}
        onAdd={() => setSubView('add')}
        onNotify={() => setSubView('notify')}
        onSelectAsset={onSelectAsset}
        onOpenDetail={(symbol) => {
          setSelectedSymbol(symbol);
          setSubView('detail');
        }}
      />
      {ready && dashboard && <PortfolioInsights dashboard={dashboard} />}
    </div>
  );
}
