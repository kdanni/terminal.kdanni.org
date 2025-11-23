import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { ApiError, useApiClient } from '../apiClient';
import AssetTable from '../components/AssetTable';
import { Breadcrumbs, type BreadcrumbItem } from '../components/Breadcrumbs';
import { GlobalLoadingShell } from '../components/GlobalLoadingShell';
import { type PortalOutletContext } from '../components/PortalLayout';
import { OhlcvExplorer } from '../components/OhlcvExplorer';
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

function buildAssetKey(symbol: string, exchange?: string | null): string {
  const normalizedExchange = normalizeExchangeValue(exchange);
  return `${symbol}-${normalizedExchange || 'na'}`;
}

type CatalogFilters = {
  assetClass: string;
  exchange: string;
  country: string;
  currency: string;
  category: string;
  watchStatus: 'any' | 'watching' | 'not-watching';
};

type QuickFilter = {
  label: string;
  description?: string;
  filters: Partial<CatalogFilters>;
  presetSearch?: string;
};

type SummaryItem = {
  label: string;
  value: string;
  description?: string;
};

type CatalogNotice = {
  tone?: 'info' | 'warning';
  title: string;
  body: string;
};

export type FeaturedLink = {
  title: string;
  description: string;
  to: string;
};

const DEFAULT_FILTERS: CatalogFilters = {
  assetClass: '',
  exchange: '',
  country: '',
  currency: '',
  category: '',
  watchStatus: 'any'
};

type BuildApiUrlParams = {
  baseUrl: string;
  search: string;
  page: number;
  pageSize: number;
  filters: CatalogFilters;
};

function buildApiUrl({ baseUrl, search, page, pageSize, filters }: BuildApiUrlParams): string {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  const safeSearch = sanitizeSearchTerm(search);
  if (safeSearch) {
    params.set('search', safeSearch);
  }

  if (filters.assetClass) {
    params.set('assetType', sanitizeFilterValue(filters.assetClass));
  }
  if (filters.exchange) {
    params.set('exchange', sanitizeFilterValue(filters.exchange));
  }
  if (filters.country) {
    params.set('country', sanitizeFilterValue(filters.country));
  }
  if (filters.currency) {
    params.set('currency', sanitizeFilterValue(filters.currency));
  }
  if (filters.category) {
    params.set('category', sanitizeFilterValue(filters.category));
  }
  if (filters.watchStatus === 'watching') {
    params.set('watched', 'true');
  } else if (filters.watchStatus === 'not-watching') {
    params.set('watched', 'false');
  }

  return `${baseUrl}/api/assets?${params.toString()}`;
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

const ASSET_CLASS_CONFIG: Record<
  string,
  {
    displayName: string;
    description: string;
    presetFilters: Partial<CatalogFilters>;
    presetSearch?: string;
    quickFilters: QuickFilter[];
    highlights: SummaryItem[];
  }
> = {
  equity: {
    displayName: 'Equities',
    description: 'Listed common and preferred shares, ideal for broad equity screening.',
    presetFilters: { assetClass: 'stock' },
    quickFilters: [
      {
        label: 'Blue chip venues',
        description: 'NYSE and NASDAQ large-cap focus',
        filters: { assetClass: 'stock', exchange: 'NASDAQ', country: 'US', currency: 'USD' }
      },
      {
        label: 'International listings',
        description: 'Non-US equities by country code',
        filters: { assetClass: 'stock', country: '', currency: '' },
        presetSearch: 'ADR OR dual-listing'
      }
    ],
    highlights: [
      { label: 'Instrument type', value: 'Common & preferred shares' },
      { label: 'Common currencies', value: 'USD, EUR, GBP' },
      { label: 'Typical venues', value: 'NASDAQ, NYSE, LSE' }
    ]
  },
  etf: {
    displayName: 'Exchange-Traded Funds',
    description: 'Basketed exposures with intraday liquidity and curated ETF-only facets.',
    presetFilters: { assetClass: 'etf' },
    quickFilters: [
      {
        label: 'US-listed ETFs',
        description: 'USD-denominated funds on primary US venues',
        filters: { assetClass: 'etf', country: 'US', currency: 'USD', exchange: 'NYSEARCA' }
      },
      {
        label: 'Global currency mix',
        description: 'Surface non-USD listings',
        filters: { assetClass: 'etf', currency: '' },
        presetSearch: 'hedged OR currency'
      },
      {
        label: 'Income-focused',
        description: 'Highlight dividend-oriented funds',
        filters: { assetClass: 'etf', currency: 'USD' },
        presetSearch: 'dividend OR income'
      }
    ],
    highlights: [
      { label: 'Structure', value: 'Basketed funds trading intraday' },
      { label: 'Primary venues', value: 'NYSEARCA, NASDAQ' },
      { label: 'ETF facets', value: 'Currency exposure, venue, dividend tilt' }
    ]
  },
  forex: {
    displayName: 'Forex Pairs',
    description: 'Currency pairs with base/quote metadata for FX comparison.',
    presetFilters: { assetClass: 'forex' },
    quickFilters: [
      {
        label: 'Major pairs',
        description: 'USD majors for quick FX lookup',
        filters: { assetClass: 'forex', currency: 'USD' }
      },
      {
        label: 'Exotics',
        description: 'Non-USD base or quote currencies',
        filters: { assetClass: 'forex', currency: '' },
        presetSearch: 'TRY OR ZAR OR MXN'
      }
    ],
    highlights: [
      { label: 'Quote style', value: 'Base/quote pairs' },
      { label: 'Regional focus', value: 'Majors + exotics' },
      { label: 'Common venues', value: 'OTC FX desks' }
    ]
  },
  crypto: {
    displayName: 'Digital Assets',
    description: 'Crypto pairs with base/quote breakdowns for exchange comparisons.',
    presetFilters: { assetClass: 'cryptocurrency' },
    quickFilters: [
      {
        label: 'USD pairs',
        description: 'Fiat on-ramps and stablecoin pairs',
        filters: { assetClass: 'cryptocurrency', currency: 'USD' }
      },
      {
        label: 'Altcoin screen',
        description: 'Non-BTC majors and altcoins',
        filters: { assetClass: 'cryptocurrency', currency: '' },
        presetSearch: 'altcoin OR defi'
      }
    ],
    highlights: [
      { label: 'Asset scope', value: 'Spot crypto pairs' },
      { label: 'Quote mix', value: 'USD, USDT, BTC' },
      { label: 'Use cases', value: 'Exchange discovery, pair coverage' }
    ]
  },
  fund: {
    displayName: 'Funds',
    description: 'Mutual funds and pooled vehicles with screening presets.',
    presetFilters: { assetClass: 'fund' },
    quickFilters: [
      {
        label: 'US-domiciled funds',
        description: 'USD currency and US venues.',
        filters: { assetClass: 'fund', country: 'US', currency: 'USD' }
      },
      {
        label: 'Income category',
        description: 'Filters to income or dividend-tilted funds.',
        filters: { assetClass: 'fund', type: 'income' }
      }
    ],
    highlights: [
      { label: 'Common venues', value: 'US mutual fund listings' },
      { label: 'Currencies', value: 'USD primary, global mixes' },
      { label: 'Use cases', value: 'Fund screening, category pivots' }
    ]
  }
};

const US_REGIONAL_CONFIG = {
  defaultFilters: { country: 'US', currency: 'USD', exchange: 'NASDAQ' } satisfies Partial<CatalogFilters>,
  quickFilters: [
    {
      label: 'NYSE + NASDAQ',
      description: 'Primary US equity venues in USD',
      filters: { country: 'US', currency: 'USD', exchange: 'NASDAQ' }
    },
    {
      label: 'USD ETFs',
      description: 'US-listed ETFs with USD currency',
      filters: { assetClass: 'etf', country: 'US', currency: 'USD', exchange: 'NYSEARCA' }
    },
    {
      label: 'US FX + Rates',
      description: 'USD-centric forex and rates proxies',
      filters: { currency: 'USD', country: 'US' }
    }
  ] satisfies QuickFilter[],
  highlights: [
    { label: 'Region preset', value: 'United States' },
    { label: 'Currency focus', value: 'USD' },
    { label: 'Venues', value: 'NASDAQ, NYSE, NYSEARCA' }
  ] satisfies SummaryItem[],
  notice: {
    tone: 'info',
    title: 'US market focus',
    body: 'Data scoped to US exchanges with USD currency. Check exchange disclosures and SEC requirements for compliance considerations.'
  } satisfies CatalogNotice
};

type AssetResponse = {
  data?: Asset[];
  pagination?: {
    total?: number;
    totalPages?: number;
  };
};

type ToggleResponse = {
  data?: {
    watched?: boolean;
    watchListId?: string | number | null;
  };
};

function isAssetLike(value: unknown): value is Asset {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<Asset>;
  return typeof candidate.symbol === 'string' && typeof candidate.name === 'string';
}

function isAssetResponsePayload(payload: unknown): payload is AssetResponse {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const data = (payload as Record<string, unknown>).data;
  const pagination = (payload as Record<string, unknown>).pagination as
    | { total?: unknown; totalPages?: unknown }
    | undefined;

  const validPagination =
    pagination === undefined ||
    (typeof pagination.total === 'number' || pagination.total === undefined) &&
      (typeof pagination.totalPages === 'number' || pagination.totalPages === undefined);

  return (data === undefined || (Array.isArray(data) && data.every(isAssetLike))) && validPagination;
}

function isToggleResponsePayload(payload: unknown): payload is ToggleResponse {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const data = (payload as Record<string, unknown>).data as
    | { watched?: unknown; watchListId?: unknown }
    | undefined;

  if (data === undefined) {
    return true;
  }

  const validWatched = typeof data.watched === 'boolean' || data.watched === undefined;
  const validWatchListId =
    typeof data.watchListId === 'string' ||
    typeof data.watchListId === 'number' ||
    data.watchListId === null ||
    data.watchListId === undefined;

  return validWatched && validWatchListId;
}

type AppProps = {
  apiBaseUrl: string;
};

type CatalogProps = AppProps & {
  searchTerm: string;
  page: number;
  filters: CatalogFilters;
  filterSummary?: string;
  comparisonTitle?: string;
  onPageChange: (page: number) => void;
};

type CatalogPageProps = AppProps & {
  title: string;
  breadcrumbs: BreadcrumbItem[];
  presetSearch?: string;
  description?: string;
  defaultFilters?: Partial<CatalogFilters>;
  quickFilters?: QuickFilter[];
  highlights?: SummaryItem[];
  notice?: CatalogNotice;
  featuredLinks?: FeaturedLink[];
};

function Catalog({ apiBaseUrl, searchTerm, page, onPageChange, filters, filterSummary, comparisonTitle }: CatalogProps): JSX.Element {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const [pendingWatchUpdates, setPendingWatchUpdates] = useState<Set<string>>(() => new Set());
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [reloadIndex, setReloadIndex] = useState(0);
  const [lastSearchTerm, setLastSearchTerm] = useState(searchTerm);
  const { fetchWithAuth } = useApiClient(apiBaseUrl);

  const sanitizedFilters = useMemo(
    () => ({
      ...filters,
      assetClass: sanitizeFilterValue(filters.assetClass),
      exchange: sanitizeFilterValue(filters.exchange),
      country: sanitizeFilterValue(filters.country),
      currency: sanitizeFilterValue(filters.currency),
      category: sanitizeFilterValue(filters.category)
    }),
    [filters]
  );

  const normalizedSearch = useMemo(() => sanitizeSearchTerm(searchTerm), [searchTerm]);

  useEffect(() => {
    const controller = new AbortController();
    const trimmedSearch = normalizedSearch;

    async function loadAssets(): Promise<void> {
      setLoading(true);
      setError(null);
      const requestStartedAt = performance.now();

      try {
        const response = await fetchWithAuth(
          buildApiUrl({
            baseUrl: apiBaseUrl,
            search: trimmedSearch,
            page,
            pageSize: DEFAULT_PAGE_SIZE,
            filters: sanitizedFilters
          }),
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new ApiError(`Failed to load assets: ${response.status}`, response.status);
        }

        const payload = (await response.json()) as unknown;

        if (!isAssetResponsePayload(payload)) {
          throw new ApiError('Unexpected response format from asset API.');
        }

        setAssets(payload.data ?? []);
        setTotal(payload.pagination?.total ?? 0);
        setTotalPages(payload.pagination?.totalPages ?? 0);
        setPendingWatchUpdates(new Set());
        setLatencyMs(Math.round(performance.now() - requestStartedAt));
        setLastUpdated(new Date());
      } catch (fetchError) {
        if ((fetchError as Error)?.name === 'AbortError') {
          return;
        }

        logError(fetchError, {
          source: 'catalog-load',
          page,
          search: trimmedSearch,
          filters: sanitizedFilters
        });

        if (fetchError instanceof ApiError) {
          const message =
            fetchError.status === 401
              ? 'Please log in to view the asset catalog.'
              : fetchError.status === 403
                ? 'You do not have permission to view the asset catalog.'
                : fetchError.message;

          setError(new Error(message));
        } else {
          setError(fetchError instanceof Error ? fetchError : new Error('Failed to load assets'));
        }

        setAssets([]);
        setTotal(0);
        setTotalPages(0);
        setLatencyMs(null);
      } finally {
        setLoading(false);
      }
    }

    loadAssets();

    return () => controller.abort();
  }, [apiBaseUrl, fetchWithAuth, normalizedSearch, page, reloadIndex, sanitizedFilters]);

  useEffect(() => {
    if (lastSearchTerm === normalizedSearch) {
      return;
    }
    setLastSearchTerm(normalizedSearch);
    onPageChange(1);
  }, [lastSearchTerm, normalizedSearch, onPageChange]);

  const description = useMemo(() => {
    if (loading) {
      return 'Loading asset catalog…';
    }

    if (error) {
      return error.message || 'Unable to load assets from the catalog.';
    }

    if (!assets.length) {
      return 'No assets match the current filters yet.';
    }

    return `Showing ${assets.length} of ${total} assets`;
  }, [loading, error, assets, total]);

  const goToPreviousPage = (): void => {
    onPageChange(Math.max(1, page - 1));
  };

  const goToNextPage = (): void => {
    onPageChange(Math.min(totalPages || page + 1, page + 1));
  };

  const handleRetry = useCallback(() => {
    setError(null);
    setReloadIndex((current) => current + 1);
  }, []);

  const handleToggleWatch = async ({ symbol, exchange, watched, asset }: ToggleWatchRequest): Promise<void> => {
    if (!symbol) {
      return;
    }

    const normalizedExchange = normalizeExchangeValue(exchange);
    const assetKey = buildAssetKey(symbol, normalizedExchange);
    const previousAsset =
      assets.find(
        (existing) =>
          existing.symbol === symbol && normalizeExchangeValue(existing.exchange) === normalizedExchange
      ) ?? asset ?? null;

    setActionError(null);
    setPendingWatchUpdates((current) => {
      const next = new Set(current);
      next.add(assetKey);
      return next;
    });

    if (previousAsset) {
      setAssets((currentAssets) =>
        currentAssets.map((current) => {
          if (
            current.symbol !== symbol ||
            normalizeExchangeValue(current.exchange) !== normalizedExchange
          ) {
            return current;
          }

          return {
            ...current,
            watched,
            watchListId: watched
              ? current.watchListId ?? previousAsset.watchListId ?? 'pending-watch'
              : null
          };
        })
      );
    }

    let toggleError: Error | null = null;

    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/watch-list/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol,
          exchange: normalizedExchange || null,
          watched
        })
      });

      if (!response.ok) {
        throw new ApiError(`Failed to update watch status: ${response.status}`, response.status);
      }

      const payload = (await response.json()) as unknown;

      if (!isToggleResponsePayload(payload)) {
        throw new ApiError('Unexpected response from watch endpoint.');
      }

      const updatedWatched = Boolean(payload.data?.watched ?? watched);
      const updatedWatchListId = payload.data?.watchListId ?? null;

      setAssets((currentAssets) =>
        currentAssets.map((current) => {
          if (
            current.symbol !== symbol ||
            normalizeExchangeValue(current.exchange) !== normalizedExchange
          ) {
            return current;
          }

          return {
            ...current,
            watched: updatedWatched,
            watchListId: updatedWatchListId
          };
        })
      );
    } catch (error) {
      logError(error, {
        source: 'watch-toggle',
        symbol,
        exchange: normalizedExchange,
        watched
      });

      if (previousAsset) {
        setAssets((currentAssets) =>
          currentAssets.map((current) => {
            if (
              current.symbol !== symbol ||
              normalizeExchangeValue(current.exchange) !== normalizedExchange
            ) {
              return current;
            }

            return previousAsset;
          })
        );
      }

      if (error instanceof ApiError) {
        const message =
          error.status === 403
            ? 'You do not have permission to update the watch status.'
            : error.message;
        toggleError = new Error(message);
      } else {
        toggleError = error instanceof Error ? error : new Error('Failed to update watch status');
      }
    } finally {
      setPendingWatchUpdates((current) => {
        if (!current.has(assetKey)) {
          return current;
        }

        const next = new Set(current);
        next.delete(assetKey);
        return next;
      });

      if (toggleError) {
        setActionError(toggleError);
      }
    }
  };

  const isInitialLoad = loading && assets.length === 0 && !error;

  const statsCards = useMemo(() => {
    if (!assets.length) {
      return [] as { title: string; value: string; helper?: string }[];
    }

    const exchangeCounts = new Map<string, number>();
    const currencyCounts = new Map<string, number>();
    let watchedCount = 0;

    for (const asset of assets) {
      if (asset.exchange) {
        const current = exchangeCounts.get(asset.exchange) ?? 0;
        exchangeCounts.set(asset.exchange, current + 1);
      }

      if (asset.currency) {
        const current = currencyCounts.get(asset.currency) ?? 0;
        currencyCounts.set(asset.currency, current + 1);
      }

      if (asset.watched) {
        watchedCount += 1;
      }
    }

    const topExchange = Array.from(exchangeCounts.entries()).sort(([, aCount], [, bCount]) => bCount - aCount)[0];
    const topCurrency = Array.from(currencyCounts.entries()).sort(([, aCount], [, bCount]) => bCount - aCount)[0];

    return [
      {
        title: comparisonTitle ?? 'Assets in view',
        value: `${assets.length} / ${total || assets.length}`,
        helper: 'On this page'
      },
      {
        title: 'Top exchange',
        value: topExchange?.[0] ?? '—',
        helper: topExchange ? `${topExchange[1]} listed here` : 'No exchange metadata'
      },
      {
        title: 'Primary currency',
        value: topCurrency?.[0] ?? '—',
        helper: topCurrency ? `${topCurrency[1]} instruments` : 'No currency tagged'
      },
      {
        title: 'Watching in view',
        value: `${watchedCount}`,
        helper: `${Math.round((watchedCount / Math.max(assets.length, 1)) * 100)}% of this page`
      }
    ];
  }, [assets, total, comparisonTitle]);

  return (
    <div className="catalog-surface" aria-busy={loading}>
      <GlobalLoadingShell visible={isInitialLoad} message="Loading asset catalog…" />
      <div className="catalog-summary">
        <p className="app-description">{description}</p>
        {filterSummary ? (
          <p className="app-subtle">Active filters: {filterSummary}</p>
        ) : (
          <p className="app-subtle">Use the global search or presets to filter assets.</p>
        )}
        {searchTerm ? <p className="app-subtle">Search query: {searchTerm}</p> : null}
        <div className="catalog-meta" aria-live="polite">
          <span className="meta-chip">
            Results: {assets.length} / {total || 0}
          </span>
          {latencyMs != null ? <span className="meta-chip">API latency: {latencyMs} ms</span> : null}
          {lastUpdated ? <span className="meta-chip">Last updated: {lastUpdated.toLocaleTimeString()}</span> : null}
        </div>
      </div>
      {statsCards.length ? (
        <div className="comparison-grid" aria-label="Comparison summary">
          {statsCards.map((card) => (
            <div key={card.title} className="comparison-card" role="group" aria-label={card.title}>
              <p className="comparison-label">{card.title}</p>
              <p className="comparison-value">{card.value}</p>
              {card.helper ? <p className="comparison-helper">{card.helper}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
      <main>
        {error ? (
          <div role="alert" className="error-message">
            {error.message || 'Unknown error occurred.'}
            <div className="inline-actions">
              <button type="button" className="secondary-button" onClick={handleRetry}>
                Retry request
              </button>
            </div>
          </div>
        ) : null}
        {actionError && !error ? (
          <div role="alert" className="error-message">
            {actionError.message || 'Failed to update the watch status.'}
          </div>
        ) : null}
        <AssetTable
          assets={assets}
          loading={loading}
          onToggleWatch={handleToggleWatch}
          pendingWatchUpdates={pendingWatchUpdates}
          onRetry={handleRetry}
          totalCount={total}
        />
      </main>
      <footer className="pagination" aria-label="Pagination">
        <button
          type="button"
          className="pagination-button"
          onClick={goToPreviousPage}
          disabled={loading || page <= 1}
        >
          Previous
        </button>
        <span className="pagination-status">
          Page {page} of {Math.max(totalPages, 1) || 1}
        </span>
        <button
          type="button"
          className="pagination-button"
          onClick={goToNextPage}
          disabled={loading || (totalPages > 0 && page >= totalPages)}
        >
          Next
        </button>
      </footer>
    </div>
  );
}

function CatalogPage({
  apiBaseUrl,
  title,
  breadcrumbs,
  presetSearch,
  description,
  defaultFilters,
  quickFilters,
  highlights,
  notice,
  featuredLinks
}: CatalogPageProps): JSX.Element {
  const { globalSearch, setGlobalSearch } = useOutletContext<PortalOutletContext>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(() => {
    const initial = Number(searchParams.get('page'));
    return Number.isFinite(initial) && initial > 0 ? initial : 1;
  });

  useEffect(() => {
    const querySearch = sanitizeSearchTerm(searchParams.get('q') ?? '');
    if (querySearch !== globalSearch) {
      setGlobalSearch(querySearch);
    }
  }, [globalSearch, searchParams, setGlobalSearch]);

  useEffect(() => {
    if (!defaultFilters) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    let changed = false;

    const applyDefault = (param: string, value?: string): void => {
      const sanitized = value ? sanitizeFilterValue(value) : '';
      if (!sanitized || next.get(param)) {
        return;
      }
      next.set(param, sanitized);
      changed = true;
    };

    applyDefault('class', defaultFilters.assetClass);
    applyDefault('exchange', defaultFilters.exchange);
    applyDefault('country', defaultFilters.country);
    applyDefault('currency', defaultFilters.currency);
    applyDefault('category', defaultFilters.category);
    if (defaultFilters.watchStatus && defaultFilters.watchStatus !== 'any' && !next.get('watch')) {
      next.set('watch', defaultFilters.watchStatus);
      changed = true;
    }

    if (changed) {
      next.set('page', '1');
      setPage(1);
      setSearchParams(next);
    }
  }, [defaultFilters, searchParams, setSearchParams]);

  useEffect(() => {
    const trimmed = sanitizeSearchTerm(globalSearch);
    const queryValue = sanitizeSearchTerm(searchParams.get('q') ?? '');
    if (trimmed === queryValue) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    if (trimmed) {
      next.set('q', trimmed);
    } else {
      next.delete('q');
    }
    next.set('page', '1');
    setPage(1);
    setSearchParams(next);
  }, [globalSearch, searchParams, setSearchParams]);

  useEffect(() => {
    const paramPage = Number(searchParams.get('page'));
    const normalized = Number.isFinite(paramPage) && paramPage > 0 ? paramPage : 1;
    if (normalized !== page) {
      setPage(normalized);
    }
  }, [page, searchParams]);

  const updateParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams);
      updater(next);
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  const filtersFromParams = useMemo(() => {
    const watchParam = searchParams.get('watch');
    const normalizedWatch: CatalogFilters['watchStatus'] =
      watchParam === 'watching' || watchParam === 'not-watching' ? watchParam : 'any';

    return {
      assetClass: sanitizeFilterValue(searchParams.get('class') ?? ''),
      exchange: sanitizeFilterValue(searchParams.get('exchange') ?? ''),
      country: sanitizeFilterValue(searchParams.get('country') ?? ''),
      currency: sanitizeFilterValue(searchParams.get('currency') ?? ''),
      category: sanitizeFilterValue(searchParams.get('category') ?? ''),
      watchStatus: normalizedWatch
    } satisfies CatalogFilters;
  }, [searchParams]);

  const mergedFilters = useMemo(
    () => ({ ...DEFAULT_FILTERS, ...defaultFilters, ...filtersFromParams }),
    [defaultFilters, filtersFromParams]
  );

  const sanitizedFilters = useMemo(
    () => ({
      ...mergedFilters,
      assetClass: sanitizeFilterValue(mergedFilters.assetClass),
      exchange: sanitizeFilterValue(mergedFilters.exchange),
      country: sanitizeFilterValue(mergedFilters.country),
      currency: sanitizeFilterValue(mergedFilters.currency),
      category: sanitizeFilterValue(mergedFilters.category)
    }),
    [mergedFilters]
  );

  const handleFilterChange = (key: keyof CatalogFilters, value: string): void => {
    const paramKey: Record<keyof CatalogFilters, string> = {
      assetClass: 'class',
      exchange: 'exchange',
      country: 'country',
      currency: 'currency',
      category: 'category',
      watchStatus: 'watch'
    };

    updateParams((params) => {
      const trimmedValue = key === 'watchStatus' ? value.trim() : sanitizeFilterValue(value);
      const targetKey = paramKey[key];
      if (!trimmedValue || (key === 'watchStatus' && trimmedValue === 'any')) {
        params.delete(targetKey);
      } else {
        params.set(targetKey, trimmedValue);
      }
      params.set('page', '1');
    });
    setPage(1);
  };

  const handleQuickFilter = (quickFilter: QuickFilter): void => {
    updateParams((params) => {
      params.delete('class');
      params.delete('exchange');
      params.delete('country');
      params.delete('currency');
      params.delete('category');
      params.delete('watch');

      if (quickFilter.presetSearch) {
        const sanitizedPreset = sanitizeSearchTerm(quickFilter.presetSearch);
        params.set('q', sanitizedPreset);
        setGlobalSearch(sanitizedPreset);
      }

      if (quickFilter.filters.assetClass != null && quickFilter.filters.assetClass !== '') {
        params.set('class', sanitizeFilterValue(quickFilter.filters.assetClass));
      }
      if (quickFilter.filters.exchange != null && quickFilter.filters.exchange !== '') {
        params.set('exchange', sanitizeFilterValue(quickFilter.filters.exchange));
      }
      if (quickFilter.filters.country != null && quickFilter.filters.country !== '') {
        params.set('country', sanitizeFilterValue(quickFilter.filters.country));
      }
      if (quickFilter.filters.currency != null && quickFilter.filters.currency !== '') {
        params.set('currency', sanitizeFilterValue(quickFilter.filters.currency));
      }
      if (quickFilter.filters.category != null && quickFilter.filters.category !== '') {
        params.set('category', sanitizeFilterValue(quickFilter.filters.category));
      }
      if (quickFilter.filters.watchStatus && quickFilter.filters.watchStatus !== 'any') {
        params.set('watch', quickFilter.filters.watchStatus);
      }

      params.set('page', '1');
      setPage(1);
    });
  };

  const handleClearFilters = (): void => {
    updateParams((params) => {
      params.delete('class');
      params.delete('exchange');
      params.delete('country');
      params.delete('currency');
      params.delete('category');
      params.delete('watch');
      params.set('page', '1');
    });
    setPage(1);
  };

  const searchQuery = useMemo(
    () =>
      sanitizeSearchTerm(
        [presetSearch?.trim(), globalSearch.trim()]
          .filter((value) => Boolean(value?.length))
          .join(' ')
          .trim()
      ),
    [globalSearch, presetSearch]
  );

  const filterSummary = useMemo(() => {
    const tokens = [
      sanitizedFilters.assetClass ? `Class: ${titleCase(sanitizedFilters.assetClass)}` : '',
      sanitizedFilters.exchange ? `Exchange: ${sanitizedFilters.exchange}` : '',
      sanitizedFilters.country ? `Country: ${sanitizedFilters.country}` : '',
      sanitizedFilters.currency ? `Currency: ${sanitizedFilters.currency}` : '',
      sanitizedFilters.category ? `Category: ${sanitizedFilters.category}` : '',
      sanitizedFilters.watchStatus !== 'any' ? `Watch: ${sanitizedFilters.watchStatus}` : ''
    ].filter(Boolean);

    return tokens.join(' • ');
  }, [sanitizedFilters]);

  const headerDescription =
    description ?? 'Browse the asset catalog and refine the results with the global search bar above.';

  const handlePageChange = (nextPage: number): void => {
    const normalized = Math.max(1, nextPage);
    setPage(normalized);
    updateParams((params) => {
      params.set('page', String(normalized));
    });
  };

  return (
    <section className="page-shell">
      <Breadcrumbs items={breadcrumbs} />
      <header className="page-header">
        <p className="page-kicker">Asset Catalog</p>
        <h1>{title}</h1>
        {headerDescription ? <p className="app-description">{headerDescription}</p> : null}
        {highlights?.length ? (
          <div className="highlight-grid" role="list">
            {highlights.map((item) => (
              <div key={item.label} className="highlight-card" role="listitem">
                <p className="highlight-label">{item.label}</p>
                <p className="highlight-value">{item.value}</p>
                {item.description ? <p className="highlight-description">{item.description}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
        {notice ? (
          <div className={`notice-card notice-${notice.tone ?? 'info'}`} role="note">
            <p className="notice-title">{notice.title}</p>
            <p className="notice-body">{notice.body}</p>
          </div>
        ) : null}
      </header>
      {featuredLinks?.length ? (
        <div className="link-grid" role="list" aria-label="Featured shortcuts">
          {featuredLinks.map((link) => (
            <Link key={link.to} className="link-card" to={link.to} role="listitem">
              <span className="link-card-title">{link.title}</span>
              <span className="link-card-subtitle">{link.description}</span>
            </Link>
          ))}
        </div>
      ) : null}
      {quickFilters?.length ? (
        <div className="quick-filters" role="list">
          {quickFilters.map((quickFilter) => (
            <button
              key={quickFilter.label}
              type="button"
              className="quick-filter-pill"
              onClick={() => handleQuickFilter(quickFilter)}
              role="listitem"
            >
              <span className="pill-title">{quickFilter.label}</span>
              {quickFilter.description ? <span className="pill-subtitle">{quickFilter.description}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
      <form className="filter-panel" role="search" aria-label="Catalog filters" onSubmit={(event) => event.preventDefault()}>
        <div className="filter-grid">
          <label className="filter-field" htmlFor="filter-class">
            <span className="filter-label">Asset class</span>
            <input
              id="filter-class"
              type="text"
              value={sanitizedFilters.assetClass}
              onChange={(event) => handleFilterChange('assetClass', event.target.value)}
              placeholder="e.g., equity or crypto"
              className="search-input"
            />
          </label>
          <label className="filter-field" htmlFor="filter-exchange">
            <span className="filter-label">Exchange</span>
            <input
              id="filter-exchange"
              type="text"
              value={sanitizedFilters.exchange}
              onChange={(event) => handleFilterChange('exchange', event.target.value)}
              placeholder="e.g., NASDAQ"
              className="search-input"
            />
          </label>
          <label className="filter-field" htmlFor="filter-country">
            <span className="filter-label">Country/Region</span>
            <input
              id="filter-country"
              type="text"
              value={sanitizedFilters.country}
              onChange={(event) => handleFilterChange('country', event.target.value)}
              placeholder="e.g., US"
              className="search-input"
            />
          </label>
          <label className="filter-field" htmlFor="filter-currency">
            <span className="filter-label">Currency</span>
            <input
              id="filter-currency"
              type="text"
              value={sanitizedFilters.currency}
              onChange={(event) => handleFilterChange('currency', event.target.value)}
              placeholder="e.g., USD"
              className="search-input"
            />
          </label>
          <label className="filter-field" htmlFor="filter-category">
            <span className="filter-label">Category</span>
            <input
              id="filter-category"
              type="text"
              value={sanitizedFilters.category}
              onChange={(event) => handleFilterChange('category', event.target.value)}
              placeholder="e.g., thematic, growth, bond"
              className="search-input"
            />
          </label>
          <label className="filter-field" htmlFor="filter-watch">
            <span className="filter-label">Watch status</span>
            <select
              id="filter-watch"
              value={sanitizedFilters.watchStatus}
              onChange={(event) => handleFilterChange('watchStatus', event.target.value)}
              className="search-input"
            >
              <option value="any">Any</option>
              <option value="watching">Watching</option>
              <option value="not-watching">Not watching</option>
            </select>
          </label>
        </div>
        <div className="inline-actions">
          <button type="button" className="secondary-button" onClick={handleClearFilters}>
            Clear filters
          </button>
        </div>
      </form>
      <Catalog
        apiBaseUrl={apiBaseUrl}
        searchTerm={searchQuery}
        page={page}
        filters={sanitizedFilters}
        filterSummary={filterSummary}
        comparisonTitle={title}
        onPageChange={handlePageChange}
      />
    </section>
  );
}

function AssetClassesIndex(): JSX.Element {
  const featuredClasses = Object.entries(ASSET_CLASS_CONFIG);

  return (
    <section className="page-shell">
      <Breadcrumbs items={[{ label: 'Asset Catalog', path: '/catalog' }, { label: 'Asset Classes' }]} />
      <header className="page-header">
        <p className="page-kicker">Catalog</p>
        <h1>Asset Classes</h1>
        <p className="app-description">Jump into a curated view for each asset class.</p>
      </header>
      <div className="link-grid" role="list">
        {featuredClasses.map(([className, config]) => (
          <Link
            key={className}
            className="link-card"
            to={`/catalog/classes/${encodeURIComponent(className)}`}
            role="listitem"
          >
            <span className="link-card-title">{config.displayName}</span>
            <span className="link-card-subtitle">{config.description}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function AssetClassCatalogPage({ apiBaseUrl }: AppProps): JSX.Element {
  const { className } = useParams<{ className: string }>();
  const normalizedClass = className ? className.replace(/-/g, ' ').toLowerCase() : '';
  const config = ASSET_CLASS_CONFIG[normalizedClass] ?? {
    displayName: titleCase(normalizedClass || 'Class'),
    description: 'Class-specific catalog view.',
    presetFilters: normalizedClass ? { assetClass: normalizedClass } : {},
    quickFilters: [],
    highlights: []
  };

  return (
    <CatalogPage
      apiBaseUrl={apiBaseUrl}
      title={`${config.displayName} Assets`}
      description={config.description}
      defaultFilters={config.presetFilters}
      presetSearch={config.presetSearch}
      quickFilters={config.quickFilters}
      highlights={config.highlights}
      breadcrumbs={[
        { label: 'Asset Catalog', path: '/catalog' },
        { label: 'Asset Classes', path: '/catalog/classes' },
        { label: config.displayName || 'Class detail' }
      ]}
    />
  );
}

function RegionalIndexPage(): JSX.Element {
  return (
    <section className="page-shell">
      <Breadcrumbs items={[{ label: 'Asset Catalog', path: '/catalog' }, { label: 'Regional Views' }]} />
      <header className="page-header">
        <p className="page-kicker">Catalog</p>
        <h1>Regional Views</h1>
        <p className="app-description">Focus on specific markets starting with the United States.</p>
      </header>
      <div className="link-grid" role="list">
        <Link className="link-card" to="/catalog/regions/us" role="listitem">
          <span className="link-card-title">United States</span>
          <span className="link-card-subtitle">View assets listed on US exchanges</span>
        </Link>
      </div>
    </section>
  );
}

function UsRegionalCatalogPage({ apiBaseUrl }: AppProps): JSX.Element {
  return (
    <CatalogPage
      apiBaseUrl={apiBaseUrl}
      title="United States"
      description="US-listed securities and instruments."
      presetSearch="region:us"
      defaultFilters={US_REGIONAL_CONFIG.defaultFilters}
      quickFilters={US_REGIONAL_CONFIG.quickFilters}
      highlights={US_REGIONAL_CONFIG.highlights}
      notice={US_REGIONAL_CONFIG.notice}
      breadcrumbs={[
        { label: 'Asset Catalog', path: '/catalog' },
        { label: 'Regional Views', path: '/catalog/regions' },
        { label: 'United States' }
      ]}
    />
  );
}

function OhlcvVisualizationPage({ apiBaseUrl }: AppProps): JSX.Element {
  return (
    <section className="page-shell">
      <Breadcrumbs items={[{ label: 'Asset Catalog', path: '/catalog' }, { label: 'OHLCV Visualization' }]} />
      <OhlcvExplorer apiBaseUrl={apiBaseUrl} />
    </section>
  );
}

export { CatalogPage, AssetClassCatalogPage, AssetClassesIndex, RegionalIndexPage, UsRegionalCatalogPage, OhlcvVisualizationPage };
