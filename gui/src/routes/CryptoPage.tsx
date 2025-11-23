import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiError, useApiClient } from '../apiClient';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CryptoTable } from '../components/CryptoTable';
import { GlobalLoadingShell } from '../components/GlobalLoadingShell';
import { logError } from '../errorReporting';
import { sanitizeFilterValue, sanitizeSearchTerm } from '../sanitizers';
import type { Asset, ToggleWatchRequest } from '../types';

const DEFAULT_PAGE_SIZE = 25;

type CryptoApiResponse = {
  data?: Asset[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type CryptoPageProps = {
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

export function CryptoPage({ apiBaseUrl }: CryptoPageProps): JSX.Element {
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
  const [searchInput, setSearchInput] = useState(() => sanitizeSearchTerm(searchParams.get('search') ?? ''));
  const [baseInput, setBaseInput] = useState(() => sanitizeFilterValue(searchParams.get('base') ?? ''));
  const [quoteInput, setQuoteInput] = useState(() => sanitizeFilterValue(searchParams.get('quote') ?? ''));
  const [exchangeInput, setExchangeInput] = useState(() => sanitizeFilterValue(searchParams.get('exchange') ?? ''));
  const [watchFilter, setWatchFilter] = useState(() => searchParams.get('watched') ?? 'any');

  useEffect(() => {
    const paramPage = Number(searchParams.get('page'));
    const normalized = Number.isFinite(paramPage) && paramPage > 0 ? paramPage : 1;
    if (normalized !== page) {
      setPage(normalized);
    }
  }, [page, searchParams]);

  useEffect(() => {
    setSearchInput(sanitizeSearchTerm(searchParams.get('search') ?? ''));
    setBaseInput(sanitizeFilterValue(searchParams.get('base') ?? ''));
    setQuoteInput(sanitizeFilterValue(searchParams.get('quote') ?? ''));
    setExchangeInput(sanitizeFilterValue(searchParams.get('exchange') ?? ''));
    setWatchFilter(searchParams.get('watched') ?? 'any');
  }, [searchParams]);

  const searchFilter = useMemo(() => sanitizeSearchTerm(searchParams.get('search') ?? ''), [searchParams]);
  const baseFilter = useMemo(() => sanitizeFilterValue(searchParams.get('base') ?? ''), [searchParams]);
  const quoteFilter = useMemo(() => sanitizeFilterValue(searchParams.get('quote') ?? ''), [searchParams]);
  const exchangeFilter = useMemo(() => sanitizeFilterValue(searchParams.get('exchange') ?? ''), [searchParams]);
  const watchedFilter = useMemo(() => searchParams.get('watched') ?? 'any', [searchParams]);

  useEffect(() => {
    if (!apiBaseUrl) {
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(DEFAULT_PAGE_SIZE));

    if (searchFilter) {
      params.set('search', searchFilter);
    }

    if (baseFilter) {
      params.set('base', baseFilter);
    }

    if (quoteFilter) {
      params.set('quote', quoteFilter);
    }

    if (exchangeFilter) {
      params.set('exchange', exchangeFilter);
    }

    if (watchedFilter === 'true' || watchedFilter === 'false') {
      params.set('watched', watchedFilter);
    }

    const url = `${apiBaseUrl}/api/crypto?${params.toString()}`;
    const startTime = performance.now();

    const loadCryptos = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchWithAuth(url, { signal: controller.signal });

        if (!response.ok) {
          throw new ApiError('Failed to load crypto pairs from the catalog.', response.status);
        }

        const payload = (await response.json()) as CryptoApiResponse;
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

        logError(fetchError as Error, { context: 'crypto-table' });
        setError(fetchError instanceof Error ? fetchError : new Error('Unable to load crypto catalog.'));
        setAssets([]);
      } finally {
        setLoading(false);
      }
    };

    void loadCryptos();

    return () => {
      controller.abort();
    };
  }, [apiBaseUrl, baseFilter, exchangeFilter, fetchWithAuth, page, quoteFilter, reloadIndex, searchFilter, watchedFilter]);

  const updateParams = (nextPage: number): void => {
    const params = new URLSearchParams();
    params.set('page', String(nextPage));

    if (searchInput) {
      params.set('search', sanitizeSearchTerm(searchInput));
    }

    if (baseInput) {
      params.set('base', sanitizeFilterValue(baseInput));
    }

    if (quoteInput) {
      params.set('quote', sanitizeFilterValue(quoteInput));
    }

    if (exchangeInput) {
      params.set('exchange', sanitizeFilterValue(exchangeInput));
    }

    if (watchFilter === 'true' || watchFilter === 'false') {
      params.set('watched', watchFilter);
    }

    setSearchParams(params);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setPage(1);
    updateParams(1);
  };

  const handleClear = (): void => {
    setSearchInput('');
    setBaseInput('');
    setQuoteInput('');
    setExchangeInput('');
    setWatchFilter('any');
    setPage(1);
    setSearchParams(new URLSearchParams({ page: '1' }));
  };

  const handleToggleWatch = async ({ symbol, watched, exchange }: ToggleWatchRequest): Promise<void> => {
    const rowKey = buildAssetKey({ symbol, exchange: exchange ?? '' });
    setPendingWatchUpdates((current) => new Set(current).add(rowKey));
    setActionError(null);

    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/watch-list/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, exchange: exchange ?? '', watched })
      });

      if (!response.ok) {
        throw new ApiError('Unable to update watch status for this pair.', response.status);
      }

      const payload = (await response.json()) as { data?: { watched?: boolean } };
      const nextWatched = payload?.data?.watched ?? watched;
      setAssets((current) =>
        current.map((asset) =>
          asset.symbol === symbol ? { ...asset, watched: Boolean(nextWatched) } : asset
        )
      );
    } catch (toggleError) {
      const normalizedError = toggleError instanceof Error
        ? toggleError
        : new Error('Unable to update the watch list at this time.');
      setActionError(normalizedError);
      logError(toggleError as Error, { context: 'crypto-watch-toggle' });
    } finally {
      setPendingWatchUpdates((current) => {
        const next = new Set(current);
        next.delete(rowKey);
        return next;
      });
    }
  };

  const breadcrumbs = useMemo(
    () => [
      { label: 'Asset Catalog', path: '/catalog' },
      { label: 'Crypto Pairs' }
    ],
    []
  );

  const hasFilters = Boolean(
    searchFilter || baseFilter || quoteFilter || exchangeFilter || (watchedFilter !== 'any')
  );
  const activeFiltersLabel = [
    searchFilter ? `Search: "${searchFilter}"` : null,
    baseFilter ? `Base: "${baseFilter}"` : null,
    quoteFilter ? `Quote: "${quoteFilter}"` : null,
    exchangeFilter ? `Exchange: "${exchangeFilter}"` : null,
    watchedFilter !== 'any' ? `Watched: ${watchedFilter}` : null
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="page-shell">
      <Breadcrumbs items={breadcrumbs} />
      <header className="page-header">
        <p className="page-kicker">Catalog</p>
        <h1>Crypto pairs</h1>
        <p className="app-description">
          Browse the cryptocurrency pairs we ingest from Twelve Data with quick filters for base/quote currencies and venue availability.
        </p>
        <div className="catalog-meta" aria-live="polite">
          <span className="meta-chip">Page {page}</span>
          {latencyMs != null ? <span className="meta-chip">API latency: {latencyMs} ms</span> : null}
          {lastUpdated ? <span className="meta-chip">Updated {lastUpdated.toLocaleTimeString()}</span> : null}
        </div>
      </header>

      <div className="filter-panel">
        <form className="filter-grid" onSubmit={handleSubmit} aria-label="Crypto filters">
          <label className="filter-field">
            <span className="filter-label">Search</span>
            <input
              type="search"
              name="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Symbol or currency"
              className="text-input"
            />
          </label>
          <label className="filter-field">
            <span className="filter-label">Base currency</span>
            <input
              type="text"
              name="base"
              value={baseInput}
              onChange={(event) => setBaseInput(event.target.value)}
              placeholder="e.g. Bitcoin"
              className="text-input"
            />
          </label>
          <label className="filter-field">
            <span className="filter-label">Quote currency</span>
            <input
              type="text"
              name="quote"
              value={quoteInput}
              onChange={(event) => setQuoteInput(event.target.value)}
              placeholder="e.g. US Dollar"
              className="text-input"
            />
          </label>
          <label className="filter-field">
            <span className="filter-label">Exchange</span>
            <input
              type="text"
              name="exchange"
              value={exchangeInput}
              onChange={(event) => setExchangeInput(event.target.value)}
              placeholder="Any available venue"
              className="text-input"
            />
          </label>
          <label className="filter-field">
            <span className="filter-label">Watch status</span>
            <select
              name="watched"
              value={watchFilter}
              onChange={(event) => setWatchFilter(event.target.value)}
              className="select-input"
            >
              <option value="any">Any</option>
              <option value="true">Watching</option>
              <option value="false">Not watching</option>
            </select>
          </label>
          <div className="inline-actions">
            <button type="submit" className="primary-button">
              Apply filters
            </button>
            <button type="button" className="secondary-button" onClick={handleClear}>
              Reset
            </button>
          </div>
        </form>
        {hasFilters ? <p className="app-subtle">Active filters: {activeFiltersLabel}</p> : null}
      </div>

      {error ? (
        <div role="alert" className="error-message">
          {error.message || 'Unable to load crypto pairs right now.'}
          <div className="inline-actions">
            <button type="button" className="secondary-button" onClick={() => setReloadIndex((i) => i + 1)}>
              Retry request
            </button>
          </div>
        </div>
      ) : null}

      {actionError ? (
        <div role="alert" className="error-message">
          {actionError.message || 'Unable to update watch preferences.'}
        </div>
      ) : null}

      <GlobalLoadingShell visible={loading && assets.length === 0} message="Loading crypto catalog…" />

      <CryptoTable
        assets={assets}
        loading={loading}
        pendingWatchUpdates={pendingWatchUpdates}
        onToggleWatch={handleToggleWatch}
        onRetry={() => setReloadIndex((i) => i + 1)}
        totalCount={totalCount}
      />

      <footer className="pagination" aria-label="Pagination">
        <button
          type="button"
          className="pagination-button"
          disabled={loading || page <= 1}
          onClick={() => {
            const nextPage = Math.max(1, page - 1);
            setPage(nextPage);
            updateParams(nextPage);
          }}
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
          onClick={() => {
            const nextPage = totalPages > 0 ? Math.min(totalPages, page + 1) : page + 1;
            setPage(nextPage);
            updateParams(nextPage);
          }}
        >
          Next
        </button>
      </footer>
    </section>
  );
}
