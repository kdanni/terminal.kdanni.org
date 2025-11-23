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

type CommodityApiResponse = {
  data?: Asset[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type CommodityPageProps = {
  apiBaseUrl: string;
};

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

export function CommodityPage({ apiBaseUrl }: CommodityPageProps): JSX.Element {
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
  const [categoryInput, setCategoryInput] = useState(() => sanitizeFilterValue(searchParams.get('category') ?? ''));
  const [watchFilter, setWatchFilter] = useState(() => searchParams.get('watched') ?? 'any');

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
    setCategoryInput(sanitizeFilterValue(searchParams.get('category') ?? ''));
    setWatchFilter(searchParams.get('watched') ?? 'any');
  }, [searchParams]);

  const tickerFilter = useMemo(() => sanitizeFilterValue(searchParams.get('ticker') ?? ''), [searchParams]);
  const nameFilter = useMemo(() => sanitizeSearchTerm(searchParams.get('name') ?? ''), [searchParams]);
  const categoryFilter = useMemo(() => sanitizeFilterValue(searchParams.get('category') ?? ''), [searchParams]);
  const watchStatusFilter = useMemo(() => searchParams.get('watched') ?? 'any', [searchParams]);

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

    if (categoryFilter) {
      params.set('category', categoryFilter);
    }

    if (watchStatusFilter === 'true' || watchStatusFilter === 'false') {
      params.set('watched', watchStatusFilter);
    }

    const url = `${apiBaseUrl}/api/commodity?${params.toString()}`;
    const startTime = performance.now();

    const loadCommodities = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchWithAuth(url, { signal: controller.signal });

        if (!response.ok) {
          throw new ApiError('Failed to load commodity catalog.', response.status);
        }

        const payload = (await response.json()) as CommodityApiResponse;
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

        logError(fetchError as Error, { context: 'commodity-table' });
        setError(fetchError instanceof Error ? fetchError : new Error('Unable to load commodity catalog right now.'));
        setAssets([]);
      } finally {
        setLoading(false);
      }
    };

    void loadCommodities();

    return () => {
      controller.abort();
    };
  }, [apiBaseUrl, categoryFilter, fetchWithAuth, nameFilter, page, reloadIndex, tickerFilter, watchStatusFilter]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setPage(1);

    const next = new URLSearchParams(searchParams);
    const normalizedTicker = sanitizeFilterValue(tickerInput);
    const normalizedName = sanitizeSearchTerm(nameInput);
    const normalizedCategory = sanitizeFilterValue(categoryInput);

    if (normalizedTicker) {
      next.set('ticker', normalizedTicker);
    } else {
      next.delete('ticker');
    }

    if (normalizedName) {
      next.set('name', normalizedName);
    } else {
      next.delete('name');
    }

    if (normalizedCategory) {
      next.set('category', normalizedCategory);
    } else {
      next.delete('category');
    }

    if (watchFilter === 'true' || watchFilter === 'false') {
      next.set('watched', watchFilter);
    } else {
      next.delete('watched');
    }

    next.set('page', '1');
    setSearchParams(next);
    setReloadIndex((current) => current + 1);
  };

  const handleResetFilters = (): void => {
    setTickerInput('');
    setNameInput('');
    setCategoryInput('');
    setWatchFilter('any');
    setPage(1);

    const next = new URLSearchParams(searchParams);
    next.delete('ticker');
    next.delete('name');
    next.delete('category');
    next.delete('watched');
    next.delete('page');
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
      logError(toggleErrorCandidate, { context: 'commodity-watch-toggle', symbol, exchange: normalizedExchange });
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

  const handlePageChange = (nextPage: number): void => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) {
      return;
    }

    setPage(nextPage);
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
  };

  const breadcrumbs = useMemo(
    () => [
      { label: 'Asset Catalog', path: '/catalog' },
      { label: 'Commodities' }
    ],
    []
  );

  const hasFilters = Boolean(tickerFilter || nameFilter || categoryFilter || watchStatusFilter !== 'any');
  const activeFiltersLabel = [
    tickerFilter ? `Ticker: ${tickerFilter}` : null,
    nameFilter ? `Name: ${nameFilter}` : null,
    categoryFilter ? `Category: ${categoryFilter}` : null,
    watchStatusFilter !== 'any' ? `Watch: ${watchStatusFilter}` : null
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="page-shell">
      <Breadcrumbs items={breadcrumbs} />
      <header className="page-header">
        <p className="page-kicker">Catalog</p>
        <h1>Commodity data table</h1>
        <p className="app-description">
          Browse commodity exposures with filters, pagination, and watch list support.
        </p>
        <div className="catalog-meta" aria-live="polite">
          <span className="meta-chip">Page {page}</span>
          {latencyMs != null ? <span className="meta-chip">API latency: {latencyMs} ms</span> : null}
          {lastUpdated ? <span className="meta-chip">Updated {lastUpdated.toLocaleTimeString()}</span> : null}
          <span className="meta-chip">Total: {totalCount}</span>
        </div>
      </header>

      <form className="filter-panel" onSubmit={handleSubmit} aria-label="Commodity filters">
        <div className="filter-grid">
          <label className="filter-field">
            <span className="filter-label">Ticker</span>
            <input
              type="text"
              value={tickerInput}
              onChange={(event) => setTickerInput(event.target.value)}
              placeholder="GC, SI, CL…"
              className="search-input"
            />
          </label>
          <label className="filter-field">
            <span className="filter-label">Name</span>
            <input
              type="search"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder="Gold, WTI, Copper…"
              className="search-input"
            />
          </label>
          <label className="filter-field">
            <span className="filter-label">Category</span>
            <input
              type="text"
              value={categoryInput}
              onChange={(event) => setCategoryInput(event.target.value)}
              placeholder="Metals, Energy, Agriculture…"
              className="search-input"
            />
          </label>
          <label className="filter-field">
            <span className="filter-label">Watch status</span>
            <select
              value={watchFilter}
              onChange={(event) => setWatchFilter(event.target.value)}
              className="search-input"
            >
              <option value="any">Any</option>
              <option value="true">Watching</option>
              <option value="false">Not watching</option>
            </select>
          </label>
        </div>
        <div className="inline-actions">
          <button type="submit" className="primary-button">
            Apply filters
          </button>
          <button type="button" className="secondary-button" onClick={handleResetFilters}>
            Reset
          </button>
        </div>
        {hasFilters ? <p className="app-subtle">Active filters: {activeFiltersLabel}</p> : null}
      </form>

      {error ? (
        <div role="alert" className="error-message">
          {error.message || 'Unable to load commodity catalog.'}
          <div className="inline-actions">
            <button type="button" className="secondary-button" onClick={() => setReloadIndex((current) => current + 1)}>
              Retry request
            </button>
          </div>
        </div>
      ) : null}

      {actionError ? (
        <div role="alert" className="error-message">
          {actionError.message || 'Failed to update watch status.'}
        </div>
      ) : null}

      <GlobalLoadingShell visible={loading && assets.length === 0} message="Loading commodity catalog…" />

      <AssetTable
        assets={assets}
        loading={loading}
        pendingWatchUpdates={pendingWatchUpdates}
        onToggleWatch={handleToggleWatch}
        onRetry={() => setReloadIndex((current) => current + 1)}
        totalCount={totalCount}
      />

      <footer className="pagination" aria-label="Pagination">
        <button
          type="button"
          className="pagination-button"
          disabled={loading || page <= 1}
          onClick={() => handlePageChange(page - 1)}
        >
          Previous
        </button>
        <span className="pagination-status">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          className="pagination-button"
          disabled={loading || (page >= totalPages && totalPages > 0)}
          onClick={() => handlePageChange(page + 1)}
        >
          Next
        </button>
      </footer>
    </section>
  );
}
