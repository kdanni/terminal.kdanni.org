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

type FundFilterPreset = {
  label: string;
  description: string;
  filters: Partial<{
    ticker: string;
    name: string;
    exchange: string;
    country: string;
    currency: string;
    type: string;
  }>;
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

type FundApiResponse = {
  data?: Asset[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type FundPageProps = {
  apiBaseUrl: string;
};

export function FundPage({ apiBaseUrl }: FundPageProps): JSX.Element {
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
  const [exchangeInput, setExchangeInput] = useState(() => sanitizeFilterValue(searchParams.get('exchange') ?? ''));
  const [countryInput, setCountryInput] = useState(() => sanitizeFilterValue(searchParams.get('country') ?? ''));
  const [currencyInput, setCurrencyInput] = useState(() => sanitizeFilterValue(searchParams.get('currency') ?? ''));
  const [typeInput, setTypeInput] = useState(() => sanitizeFilterValue(searchParams.get('type') ?? ''));
  const filterPresets = useMemo<FundFilterPreset[]>(
    () => [
      {
        label: 'US mutual funds',
        description: 'USD-denominated funds on primary US venues.',
        filters: { country: 'United States', currency: 'USD' }
      },
      {
        label: 'Income & dividend focus',
        description: 'Screen for income-tilted fund categories.',
        filters: { type: 'income', currency: '' }
      }
    ],
    []
  );

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
    setExchangeInput(sanitizeFilterValue(searchParams.get('exchange') ?? ''));
    setCountryInput(sanitizeFilterValue(searchParams.get('country') ?? ''));
    setCurrencyInput(sanitizeFilterValue(searchParams.get('currency') ?? ''));
    setTypeInput(sanitizeFilterValue(searchParams.get('type') ?? ''));
  }, [searchParams]);

  const tickerFilter = useMemo(() => sanitizeFilterValue(searchParams.get('ticker') ?? ''), [searchParams]);
  const nameFilter = useMemo(() => sanitizeSearchTerm(searchParams.get('name') ?? ''), [searchParams]);
  const exchangeFilter = useMemo(() => sanitizeFilterValue(searchParams.get('exchange') ?? ''), [searchParams]);
  const countryFilter = useMemo(() => sanitizeFilterValue(searchParams.get('country') ?? ''), [searchParams]);
  const currencyFilter = useMemo(() => sanitizeFilterValue(searchParams.get('currency') ?? ''), [searchParams]);
  const typeFilter = useMemo(() => sanitizeFilterValue(searchParams.get('type') ?? ''), [searchParams]);

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

    if (exchangeFilter) {
      params.set('exchange', exchangeFilter);
    }

    if (countryFilter) {
      params.set('country', countryFilter);
    }

    if (currencyFilter) {
      params.set('currency', currencyFilter);
    }

    if (typeFilter) {
      params.set('type', typeFilter);
    }

    const url = `${apiBaseUrl}/api/fund?${params.toString()}`;
    const startTime = performance.now();

    const loadFunds = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchWithAuth(url, { signal: controller.signal });

        if (!response.ok) {
          throw new ApiError('Failed to load fund listings.', response.status);
        }

        const payload = (await response.json()) as FundApiResponse;
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

        logError(fetchError as Error, { context: 'fund-table' });
        setError(fetchError instanceof Error ? fetchError : new Error('Unable to load funds right now.'));
        setAssets([]);
      } finally {
        setLoading(false);
      }
    };

    void loadFunds();

    return () => {
      controller.abort();
    };
  }, [apiBaseUrl, countryFilter, currencyFilter, exchangeFilter, fetchWithAuth, nameFilter, page, reloadIndex, tickerFilter, typeFilter]);

  const handleApplyFilters = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const next = new URLSearchParams(searchParams);
    const sanitizedTicker = sanitizeFilterValue(tickerInput);
    const sanitizedName = sanitizeSearchTerm(nameInput);
    const sanitizedExchange = sanitizeFilterValue(exchangeInput);
    const sanitizedCountry = sanitizeFilterValue(countryInput);
    const sanitizedCurrency = sanitizeFilterValue(currencyInput);
    const sanitizedType = sanitizeFilterValue(typeInput);

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

    if (sanitizedExchange) {
      next.set('exchange', sanitizedExchange);
    } else {
      next.delete('exchange');
    }

    if (sanitizedCountry) {
      next.set('country', sanitizedCountry);
    } else {
      next.delete('country');
    }

    if (sanitizedCurrency) {
      next.set('currency', sanitizedCurrency);
    } else {
      next.delete('currency');
    }

    if (sanitizedType) {
      next.set('type', sanitizedType);
    } else {
      next.delete('type');
    }

    next.delete('page');
    setPage(1);
    setSearchParams(next);
    setReloadIndex((current) => current + 1);
  };

  const handleClearFilters = (): void => {
    setTickerInput('');
    setNameInput('');
    setExchangeInput('');
    setCountryInput('');
    setCurrencyInput('');
    setTypeInput('');
    setPage(1);

    const next = new URLSearchParams(searchParams);
    next.delete('ticker');
    next.delete('name');
    next.delete('exchange');
    next.delete('country');
    next.delete('currency');
    next.delete('type');
    next.delete('page');
    setSearchParams(next);
    setReloadIndex((current) => current + 1);
  };

  const applyPresetFilters = (preset: FundFilterPreset): void => {
    setTickerInput(preset.filters.ticker ?? '');
    setNameInput(preset.filters.name ?? '');
    setExchangeInput(preset.filters.exchange ?? '');
    setCountryInput(preset.filters.country ?? '');
    setCurrencyInput(preset.filters.currency ?? '');
    setTypeInput(preset.filters.type ?? '');
    const next = new URLSearchParams(searchParams);

    const setParam = (key: string, value: string | undefined): void => {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    };

    setParam('ticker', sanitizeFilterValue(preset.filters.ticker ?? ''));
    setParam('name', sanitizeSearchTerm(preset.filters.name ?? ''));
    setParam('exchange', sanitizeFilterValue(preset.filters.exchange ?? ''));
    setParam('country', sanitizeFilterValue(preset.filters.country ?? ''));
    setParam('currency', sanitizeFilterValue(preset.filters.currency ?? ''));
    setParam('type', sanitizeFilterValue(preset.filters.type ?? ''));
    next.delete('page');
    setPage(1);
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
      logError(toggleErrorCandidate, { context: 'fund-watch-toggle', symbol, exchange: normalizedExchange });
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

  const hasFilters = Boolean(tickerFilter || nameFilter || exchangeFilter || countryFilter || currencyFilter || typeFilter);

  const activeFiltersLabel = [
    tickerFilter ? `Ticker contains "${tickerFilter}"` : null,
    nameFilter ? `Name contains "${nameFilter}"` : null,
    exchangeFilter ? `Exchange includes "${exchangeFilter}"` : null,
    countryFilter ? `Country contains "${countryFilter}"` : null,
    currencyFilter ? `Currency contains "${currencyFilter}"` : null,
    typeFilter ? `Type matches "${typeFilter}"` : null
  ]
    .filter(Boolean)
    .join(' · ');

  const isInitialLoad = loading && assets.length === 0;

  const breadcrumbs = useMemo(
    () => [
      { label: 'Asset Catalog', path: '/catalog' },
      { label: 'Funds' }
    ],
    []
  );

  return (
    <section className="page-shell" aria-label="Fund catalog">
      <Breadcrumbs items={breadcrumbs} />
      <header className="page-header">
        <p className="page-kicker">Catalog</p>
        <h1>Fund listings</h1>
        <p className="app-description">
          Explore funds across venues with filters for ticker, domicile, and fund category. Use presets to jump into income or US-focused screens.
        </p>
        <div className="catalog-meta" aria-live="polite">
          <span className="meta-chip">Page {page}</span>
          {latencyMs != null ? <span className="meta-chip">API latency: {latencyMs} ms</span> : null}
          {lastUpdated ? <span className="meta-chip">Updated {lastUpdated.toLocaleTimeString()}</span> : null}
        </div>
      </header>

      <div className="filter-panel">
        <div className="quick-filters" aria-label="Quick filters">
          {filterPresets.map((preset) => (
            <button
              type="button"
              key={preset.label}
              className="quick-filter-pill"
              onClick={() => applyPresetFilters(preset)}
            >
              <span className="pill-title">{preset.label}</span>
              <span className="pill-subtitle">{preset.description}</span>
            </button>
          ))}
        </div>

        <form className="filter-grid" onSubmit={handleApplyFilters} aria-label="Filter fund table">
          <label className="filter-field">
            <span className="filter-label">Ticker</span>
            <input
              name="ticker"
              value={tickerInput}
              onChange={(event) => setTickerInput(event.target.value)}
              placeholder="e.g. VTSAX"
              className="text-input"
            />
          </label>
          <label className="filter-field">
            <span className="filter-label">Name</span>
            <input
              name="name"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder="Search by fund name"
              className="text-input"
            />
          </label>
          <label className="filter-field">
            <span className="filter-label">Exchange</span>
            <input
              name="exchange"
              value={exchangeInput}
              onChange={(event) => setExchangeInput(event.target.value)}
              placeholder="Enter venue code"
              className="text-input"
            />
          </label>
          <label className="filter-field">
            <span className="filter-label">Country</span>
            <input
              name="country"
              value={countryInput}
              onChange={(event) => setCountryInput(event.target.value)}
              placeholder="Country or region"
              className="text-input"
            />
          </label>
          <label className="filter-field">
            <span className="filter-label">Currency</span>
            <input
              name="currency"
              value={currencyInput}
              onChange={(event) => setCurrencyInput(event.target.value)}
              placeholder="ISO currency (e.g. USD)"
              className="text-input"
            />
          </label>
          <label className="filter-field">
            <span className="filter-label">Type</span>
            <input
              name="type"
              value={typeInput}
              onChange={(event) => setTypeInput(event.target.value)}
              placeholder="Fund style or class"
              className="text-input"
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
          {error.message || 'Failed to load funds.'}
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

      <GlobalLoadingShell visible={isInitialLoad} message="Loading fund listings…" />

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
