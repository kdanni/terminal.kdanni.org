import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiError, useApiClient } from '../apiClient';
import AssetTable from '../components/AssetTable';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { GlobalLoadingShell } from '../components/GlobalLoadingShell';
import { logError } from '../errorReporting';
import { sanitizeFilterValue, sanitizeSearchTerm } from '../sanitizers';
import type { Asset, ToggleWatchRequest } from '../types';

const DEFAULT_PAGE_SIZE = 25;

function normalizeExchangeValue(value?: string | null): string {
  if (value == null) {
    return '';
  }

  const trimmed = String(value).trim();
  return trimmed.length === 0 ? '' : trimmed;
}

function buildAssetKey(asset: Pick<Asset, 'symbol' | 'exchange'>): string {
  const normalizedExchange = normalizeExchangeValue(asset.exchange);
  return `${asset.symbol}-${normalizedExchange || 'na'}`;
}

type StockApiResponse = {
  data?: Asset[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type StockPageProps = {
  apiBaseUrl: string;
};

export function StockPage({ apiBaseUrl }: StockPageProps): JSX.Element {
  const { fetchWithAuth } = useApiClient(apiBaseUrl);
  const [searchParams, setSearchParams] = useSearchParams();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const [pendingWatchUpdates, setPendingWatchUpdates] = useState(new Set<string>());
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [reloadIndex, setReloadIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const initialPage = useMemo(() => {
    const pageParam = Number(searchParams.get('page'));
    return Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  }, [searchParams]);

  const [page, setPage] = useState(initialPage);
  const [tickerInput, setTickerInput] = useState(() => sanitizeFilterValue(searchParams.get('ticker') ?? ''));
  const [nameInput, setNameInput] = useState(() => sanitizeSearchTerm(searchParams.get('name') ?? ''));

  useEffect(() => {
    const paramPage = Number(searchParams.get('page'));
    const normalized = Number.isFinite(paramPage) && paramPage > 0 ? paramPage : 1;
    if (normalized !== page) {
      setPage(normalized);
    }
  }, [page, searchParams]);

  useEffect(() => {
    setTickerInput(sanitizeFilterValue(searchParams.get('ticker') ?? ''));
    setNameInput(sanitizeSearchTerm(searchParams.get('name') ?? ''));
  }, [searchParams]);

  const tickerFilter = useMemo(() => sanitizeFilterValue(searchParams.get('ticker') ?? ''), [searchParams]);
  const nameFilter = useMemo(() => sanitizeSearchTerm(searchParams.get('name') ?? ''), [searchParams]);

  useEffect(() => {
    if (!apiBaseUrl) {
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(DEFAULT_PAGE_SIZE));

    if (tickerFilter) {
      params.set('ticker', tickerFilter);
    }

    if (nameFilter) {
      params.set('name', nameFilter);
    }

    const url = `${apiBaseUrl}/api/stocks?${params.toString()}`;
    const startTime = performance.now();

    const loadStocks = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchWithAuth(url, { signal: controller.signal });

        if (!response.ok) {
          throw new ApiError('Failed to load stocks from the catalog.', response.status);
        }

        const payload = (await response.json()) as StockApiResponse;
        const data = Array.isArray(payload?.data) ? payload.data : [];
        const pagination = payload.pagination ?? {
          page,
          pageSize: DEFAULT_PAGE_SIZE,
          total: data.length,
          totalPages: 1
        };

        setAssets(data);
        setLatencyMs(Math.round(performance.now() - startTime));
        setLastUpdated(new Date());
        setTotalPages(pagination.totalPages ?? 0);
        setTotalCount(pagination.total ?? data.length);
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }

        logError(fetchError as Error, { context: 'stock-table' });
        setError(fetchError instanceof Error ? fetchError : new Error('Unable to load stock catalog.'));
        setAssets([]);
      } finally {
        setLoading(false);
      }
    };

    void loadStocks();

    return () => {
      controller.abort();
    };
  }, [apiBaseUrl, fetchWithAuth, nameFilter, page, reloadIndex, tickerFilter]);

  const handleApplyFilters = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const next = new URLSearchParams(searchParams);
    const sanitizedTicker = sanitizeFilterValue(tickerInput);
    const sanitizedName = sanitizeSearchTerm(nameInput);

    if (sanitizedTicker) {
      next.set('ticker', sanitizedTicker);
    } else {
      next.delete('ticker');
    }

    if (sanitizedName) {
      next.set('name', sanitizedName);
    } else {
      next.delete('name');
    }

    next.set('page', '1');
    setPage(1);
    setSearchParams(next);
    setReloadIndex((current) => current + 1);
  };

  const handleClearFilters = (): void => {
    const next = new URLSearchParams(searchParams);
    next.delete('ticker');
    next.delete('name');
    next.set('page', '1');
    setPage(1);
    setSearchParams(next);
    setTickerInput('');
    setNameInput('');
    setReloadIndex((current) => current + 1);
  };

  const goToPreviousPage = (): void => {
    const nextPage = Math.max(page - 1, 1);
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setPage(nextPage);
    setSearchParams(next);
    setReloadIndex((current) => current + 1);
  };

  const goToNextPage = (): void => {
    const nextPage = totalPages > 0 ? Math.min(page + 1, totalPages) : page + 1;
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setPage(nextPage);
    setSearchParams(next);
    setReloadIndex((current) => current + 1);
  };

  const handleToggleWatch = async ({ symbol, exchange, watched, asset }: ToggleWatchRequest): Promise<void> => {
    if (!symbol) {
      return;
    }

    const normalizedExchange = normalizeExchangeValue(exchange);
    const assetKey = buildAssetKey({ symbol, exchange: normalizedExchange });
    const previousAsset = assets.find(
      (item) => item.symbol === symbol && normalizeExchangeValue(item.exchange) === normalizedExchange
    );

    setActionError(null);
    setPendingWatchUpdates((current) => {
      const next = new Set(current);
      next.add(assetKey);
      return next;
    });

    if (previousAsset || asset) {
      const fallbackAsset = previousAsset ?? asset;
      setAssets((currentAssets) =>
        currentAssets.map((current) =>
          current.symbol === symbol && normalizeExchangeValue(current.exchange) === normalizedExchange
            ? {
                ...current,
                watched,
                watchListId: watched ? current.watchListId ?? fallbackAsset?.watchListId ?? 'pending-watch' : null
              }
            : current
        )
      );
    }

    let toggleError: Error | null = null;

    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/watch-list/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symbol, exchange: normalizedExchange || null, watched })
      });

      if (!response.ok) {
        throw new ApiError('Failed to update watch status.', response.status);
      }

      const payload = (await response.json()) as { data?: { watched?: boolean; watchListId?: string | number | null } };
      const updatedWatched = Boolean(payload?.data?.watched ?? watched);
      const updatedWatchListId = payload?.data?.watchListId ?? null;

      setAssets((currentAssets) =>
        currentAssets.map((current) =>
          current.symbol === symbol && normalizeExchangeValue(current.exchange) === normalizedExchange
            ? { ...current, watched: updatedWatched, watchListId: updatedWatchListId }
            : current
        )
      );
    } catch (toggleErrorCandidate) {
      logError(toggleErrorCandidate, { context: 'stock-watch-toggle', symbol, exchange: normalizedExchange });
      toggleError =
        toggleErrorCandidate instanceof ApiError
          ? new Error(toggleErrorCandidate.message)
          : toggleErrorCandidate instanceof Error
            ? toggleErrorCandidate
            : new Error('Unable to update watch status.');

      if (previousAsset) {
        setAssets((currentAssets) =>
          currentAssets.map((current) =>
            current.symbol === symbol && normalizeExchangeValue(current.exchange) === normalizedExchange ? previousAsset : current
          )
        );
      }
    } finally {
      setPendingWatchUpdates((current) => {
        const next = new Set(current);
        next.delete(assetKey);
        return next;
      });

      if (toggleError) {
        setActionError(toggleError);
      }
    }
  };

  const hasFilters = Boolean(searchParams.get('ticker') || searchParams.get('name'));
  const activeFiltersLabel = [
    searchParams.get('ticker') ? `Ticker contains "${searchParams.get('ticker')}"` : null,
    searchParams.get('name') ? `Name contains "${searchParams.get('name')}"` : null
  ]
    .filter(Boolean)
    .join(' · ');

  const isInitialLoad = loading && assets.length === 0 && !error;

  return (
    <section className="page-shell" aria-busy={loading}>
      <Breadcrumbs items={[{ label: 'Asset Catalog', path: '/catalog' }, { label: 'Stocks' }]} />
      <header className="page-header">
        <p className="page-kicker">Catalog</p>
        <h1>Stock data table</h1>
        <p className="app-description">
          Browse the stock catalog with priority filters for ticker and company name. Use the watch toggle to track listings
          of interest.
        </p>
        <div className="catalog-meta" aria-live="polite">
          <span className="meta-chip">Page {page}</span>
          {latencyMs != null ? <span className="meta-chip">API latency: {latencyMs} ms</span> : null}
          {lastUpdated ? <span className="meta-chip">Updated {lastUpdated.toLocaleTimeString()}</span> : null}
        </div>
      </header>

      <div className="filter-panel" aria-label="Stock filters">
        <form className="filter-grid" onSubmit={handleApplyFilters}>
          <label className="filter-field">
            <span className="filter-label">Ticker</span>
            <input
              type="text"
              name="ticker"
              value={tickerInput}
              onChange={(event) => setTickerInput(event.target.value)}
              placeholder="e.g. AAPL"
            />
          </label>
          <label className="filter-field">
            <span className="filter-label">Name</span>
            <input
              type="text"
              name="name"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder="e.g. Apple"
            />
          </label>
          <div className="inline-actions">
            <button type="submit" className="primary-button">
              Apply filters
            </button>
            <button type="button" className="secondary-button" onClick={handleClearFilters}>
              Reset
            </button>
          </div>
        </form>
        {hasFilters ? <p className="app-subtle">Active filters: {activeFiltersLabel}</p> : null}
      </div>

      {error ? (
        <div role="alert" className="error-message">
          {error.message || 'Failed to load stocks.'}
          <div className="inline-actions">
            <button type="button" className="secondary-button" onClick={() => setReloadIndex((current) => current + 1)}>
              Retry request
            </button>
          </div>
        </div>
      ) : null}
      {actionError && !error ? (
        <div role="alert" className="error-message">
          {actionError.message || 'Failed to update watch status.'}
        </div>
      ) : null}

      <GlobalLoadingShell visible={isInitialLoad} message="Loading stocks…" />

      <AssetTable
        assets={assets}
        loading={loading}
        pendingWatchUpdates={pendingWatchUpdates}
        onToggleWatch={handleToggleWatch}
        onRetry={() => setReloadIndex((current) => current + 1)}
        totalCount={totalCount}
      />

      <footer className="pagination" aria-label="Pagination">
        <button type="button" className="pagination-button" onClick={goToPreviousPage} disabled={loading || page <= 1}>
          Previous
        </button>
        <span className="pagination-status">Page {page}</span>
        <button
          type="button"
          className="pagination-button"
          onClick={goToNextPage}
          disabled={loading || (totalPages > 0 && page >= totalPages)}
        >
          Next
        </button>
      </footer>
    </section>
  );
}
