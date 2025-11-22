import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiError, useApiClient } from '../apiClient';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ForexTable } from '../components/ForexTable';
import { GlobalLoadingShell } from '../components/GlobalLoadingShell';
import { logError } from '../errorReporting';
import { sanitizeFilterValue, sanitizeSearchTerm } from '../sanitizers';
import type { Asset, ToggleWatchRequest } from '../types';

const DEFAULT_PAGE_SIZE = 25;

type ForexApiResponse = {
  data?: Asset[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type ForexPageProps = {
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

export function ForexPage({ apiBaseUrl }: ForexPageProps): JSX.Element {
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
  const [groupInput, setGroupInput] = useState(() => sanitizeFilterValue(searchParams.get('group') ?? ''));
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
    setGroupInput(sanitizeFilterValue(searchParams.get('group') ?? ''));
    setWatchFilter(searchParams.get('watched') ?? 'any');
  }, [searchParams]);

  const searchFilter = useMemo(() => sanitizeSearchTerm(searchParams.get('search') ?? ''), [searchParams]);
  const baseFilter = useMemo(() => sanitizeFilterValue(searchParams.get('base') ?? ''), [searchParams]);
  const quoteFilter = useMemo(() => sanitizeFilterValue(searchParams.get('quote') ?? ''), [searchParams]);
  const groupFilter = useMemo(() => sanitizeFilterValue(searchParams.get('group') ?? ''), [searchParams]);
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

    if (groupFilter) {
      params.set('group', groupFilter);
    }

    if (watchedFilter === 'true' || watchedFilter === 'false') {
      params.set('watched', watchedFilter);
    }

    const url = `${apiBaseUrl}/api/forex?${params.toString()}`;
    const startTime = performance.now();

    const loadForexPairs = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchWithAuth(url, { signal: controller.signal });

        if (!response.ok) {
          throw new ApiError('Failed to load forex pairs from the catalog.', response.status);
        }

        const payload = (await response.json()) as ForexApiResponse;
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

        logError(fetchError as Error, { context: 'forex-table' });
        setError(fetchError instanceof Error ? fetchError : new Error('Unable to load forex catalog.'));
        setAssets([]);
      } finally {
        setLoading(false);
      }
    };

    void loadForexPairs();

    return () => {
      controller.abort();
    };
  }, [apiBaseUrl, baseFilter, fetchWithAuth, groupFilter, page, quoteFilter, reloadIndex, searchFilter, watchedFilter]);

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

    if (groupInput) {
      params.set('group', sanitizeFilterValue(groupInput));
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
    setGroupInput('');
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
        current.map((asset) => (asset.symbol === symbol ? { ...asset, watched: Boolean(nextWatched) } : asset))
      );
    } catch (toggleError) {
      const normalizedError =
        toggleError instanceof Error
          ? toggleError
          : new Error('Unable to update the watch list at this time.');
      setActionError(normalizedError);
      logError(toggleError as Error, { context: 'forex-watch-toggle' });
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
      { label: 'Forex Pairs' }
    ],
    []
  );

  return (
    <div className="page-stack">
      <Breadcrumbs items={breadcrumbs} />
      <header className="page-header">
        <div>
          <p className="eyebrow">Foreign exchange</p>
          <h1>Forex pairs</h1>
          <p className="app-subtle">
            Browse forex pairs with base and quote currencies plus quick watch controls.
          </p>
          <div className="meta-grid">
            <span>Latency: {latencyMs != null ? `${latencyMs}ms` : '—'}</span>
            <span>Updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}</span>
            <span>Total pairs: {totalCount || '—'}</span>
          </div>
        </div>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={() => setReloadIndex((i) => i + 1)}>
            Refresh
          </button>
        </div>
      </header>

      <section className="card">
        <form className="filter-grid" onSubmit={handleSubmit}>
          <label className="input-field">
            <span>Search</span>
            <input
              type="search"
              name="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Symbol or currency"
            />
          </label>
          <label className="input-field">
            <span>Base currency</span>
            <input
              type="text"
              name="base"
              value={baseInput}
              onChange={(event) => setBaseInput(event.target.value)}
              placeholder="e.g. USD"
            />
          </label>
          <label className="input-field">
            <span>Quote currency</span>
            <input
              type="text"
              name="quote"
              value={quoteInput}
              onChange={(event) => setQuoteInput(event.target.value)}
              placeholder="e.g. JPY"
            />
          </label>
          <label className="input-field">
            <span>Pair group</span>
            <input
              type="text"
              name="group"
              value={groupInput}
              onChange={(event) => setGroupInput(event.target.value)}
              placeholder="Major, Minor, Exotic"
            />
          </label>
          <label className="input-field">
            <span>Watch status</span>
            <select name="watched" value={watchFilter} onChange={(event) => setWatchFilter(event.target.value)}>
              <option value="any">Any</option>
              <option value="true">Watching</option>
              <option value="false">Not watching</option>
            </select>
          </label>
          <div className="input-actions">
            <button type="submit" className="primary-button">
              Apply filters
            </button>
            <button type="button" className="ghost-button" onClick={handleClear}>
              Clear
            </button>
          </div>
        </form>

        {error ? (
          <div role="alert" className="error-message">
            {error.message || 'Unable to load forex pairs right now.'}
          </div>
        ) : null}

        {actionError ? (
          <div role="alert" className="error-message">
            {actionError.message || 'Unable to update watch preferences.'}
          </div>
        ) : null}

        <ForexTable
          assets={assets}
          loading={loading}
          pendingWatchUpdates={pendingWatchUpdates}
          onToggleWatch={handleToggleWatch}
          onRetry={() => setReloadIndex((i) => i + 1)}
          totalCount={totalCount}
        />

        <div className="pagination">
          <button
            type="button"
            className="ghost-button"
            disabled={page <= 1}
            onClick={() => {
              const nextPage = Math.max(1, page - 1);
              setPage(nextPage);
              updateParams(nextPage);
            }}
          >
            Previous
          </button>
          <span>
            Page {page} of {Math.max(totalPages, 1)}
          </span>
          <button
            type="button"
            className="ghost-button"
            disabled={page >= totalPages && totalPages > 0}
            onClick={() => {
              const nextPage = totalPages > 0 ? Math.min(totalPages, page + 1) : page + 1;
              setPage(nextPage);
              updateParams(nextPage);
            }}
          >
            Next
          </button>
        </div>
      </section>

      <GlobalLoadingShell visible={loading && assets.length === 0} message="Loading forex catalog…" />
    </div>
  );
}
