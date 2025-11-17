import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ErrorInfo,
  type ReactNode
} from 'react';
import { useAuth0, withAuthenticationRequired } from '@auth0/auth0-react';
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useOutletContext,
  useParams,
  useSearchParams
} from 'react-router-dom';
import AssetTable from './components/AssetTable';
import { Breadcrumbs, type BreadcrumbItem } from './components/Breadcrumbs';
import { PortalLayout, type PortalOutletContext } from './components/PortalLayout';
import type { Asset, ToggleWatchRequest } from './types';
import { ApiError, useApiClient } from './apiClient';

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

type BuildApiUrlParams = {
  baseUrl: string;
  search: string;
  page: number;
  pageSize: number;
};

function buildApiUrl({ baseUrl, search, page, pageSize }: BuildApiUrlParams): string {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (search) {
    params.set('search', search);
  }

  return `${baseUrl}/api/assets?${params.toString()}`;
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

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

type AppProps = {
  apiBaseUrl: string;
};

type CatalogProps = AppProps & {
  searchTerm: string;
  page: number;
  onPageChange: (page: number) => void;
};

type CatalogPageProps = AppProps & {
  title: string;
  breadcrumbs: BreadcrumbItem[];
  presetSearch?: string;
  description?: string;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Unexpected error rendering the app', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" role="alert">
          <h2>Something went wrong.</h2>
          <p>We ran into an unexpected problem while rendering the page.</p>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.message}</pre>
          </details>
          <div className="error-boundary-actions">
            <button type="button" onClick={this.handleReset} className="secondary-button">
              Try again
            </button>
            <button type="button" onClick={() => window.location.reload()} className="primary-button">
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

type GlobalLoadingShellProps = {
  visible: boolean;
  message: string;
};

function GlobalLoadingShell({ visible, message }: GlobalLoadingShellProps): JSX.Element | null {
  if (!visible) {
    return null;
  }

  return (
    <div className="global-loading-shell" role="status" aria-live="polite">
      <div className="global-loading-content">
        <div className="global-loading-spinner" aria-hidden="true" />
        <p>{message}</p>
      </div>
    </div>
  );
}

function Catalog({ apiBaseUrl, searchTerm, page, onPageChange }: CatalogProps): JSX.Element {
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

  useEffect(() => {
    const controller = new AbortController();
    const trimmedSearch = searchTerm.trim();

    async function loadAssets(): Promise<void> {
      setLoading(true);
      setError(null);
      const requestStartedAt = performance.now();

      try {
        const response = await fetchWithAuth(
          buildApiUrl({ baseUrl: apiBaseUrl, search: trimmedSearch, page, pageSize: DEFAULT_PAGE_SIZE }),
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new ApiError(`Failed to load assets: ${response.status}`, response.status);
        }

        const payload = (await response.json()) as AssetResponse;
        setAssets(payload?.data ?? []);
        setTotal(payload?.pagination?.total ?? 0);
        setTotalPages(payload?.pagination?.totalPages ?? 0);
        setPendingWatchUpdates(new Set());
        setLatencyMs(Math.round(performance.now() - requestStartedAt));
        setLastUpdated(new Date());
      } catch (fetchError) {
        if ((fetchError as Error)?.name === 'AbortError') {
          return;
        }

        console.error(fetchError);

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
  }, [apiBaseUrl, fetchWithAuth, searchTerm, page, reloadIndex]);

  useEffect(() => {
    if (lastSearchTerm === searchTerm) {
      return;
    }
    setLastSearchTerm(searchTerm);
    onPageChange(1);
  }, [lastSearchTerm, onPageChange, searchTerm]);

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

  const handleToggleWatch = async ({ symbol, exchange, watched }: ToggleWatchRequest): Promise<void> => {
    if (!symbol) {
      return;
    }

    const normalizedExchange = normalizeExchangeValue(exchange);
    const assetKey = buildAssetKey(symbol, normalizedExchange);

    setActionError(null);
    setPendingWatchUpdates((current) => {
      const next = new Set(current);
      next.add(assetKey);
      return next;
    });

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

      const payload = (await response.json()) as ToggleResponse;
      const updatedWatched = Boolean(payload?.data?.watched ?? watched);
      const updatedWatchListId = payload?.data?.watchListId ?? null;

      setAssets((currentAssets) =>
        currentAssets.map((asset) => {
          const matchesAsset =
            asset.symbol === symbol && normalizeExchangeValue(asset.exchange) === normalizedExchange;

          if (!matchesAsset) {
            return asset;
          }

          return {
            ...asset,
            watched: updatedWatched,
            watchListId: updatedWatchListId
          };
        })
      );
    } catch (toggleError) {
      console.error(toggleError);

      if (toggleError instanceof ApiError) {
        const message =
          toggleError.status === 403
            ? 'You do not have permission to update the watch status.'
            : toggleError.message;
        setActionError(new Error(message));
      } else {
        setActionError(
          toggleError instanceof Error ? toggleError : new Error('Failed to update watch status')
        );
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
    }
  };

  const isInitialLoad = loading && assets.length === 0 && !error;

  return (
    <div className="catalog-surface" aria-busy={loading}>
      <GlobalLoadingShell visible={isInitialLoad} message="Loading asset catalog…" />
      <div className="catalog-summary">
        <p className="app-description">{description}</p>
        {searchTerm ? (
          <p className="app-subtle">Active filters: {searchTerm}</p>
        ) : (
          <p className="app-subtle">Use the global search to filter assets.</p>
        )}
        <div className="catalog-meta" aria-live="polite">
          <span className="meta-chip">
            Results: {assets.length} / {total || 0}
          </span>
          {latencyMs != null ? <span className="meta-chip">API latency: {latencyMs} ms</span> : null}
          {lastUpdated ? <span className="meta-chip">Last updated: {lastUpdated.toLocaleTimeString()}</span> : null}
        </div>
      </div>
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

function CatalogPage({ apiBaseUrl, title, breadcrumbs, presetSearch, description }: CatalogPageProps): JSX.Element {
  const { globalSearch, setGlobalSearch } = useOutletContext<PortalOutletContext>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(() => {
    const initial = Number(searchParams.get('page'));
    return Number.isFinite(initial) && initial > 0 ? initial : 1;
  });

  const assetClass = searchParams.get('class') ?? '';
  const exchange = searchParams.get('exchange') ?? '';
  const country = searchParams.get('country') ?? '';
  const watchStatus = searchParams.get('watch') ?? 'any';

  useEffect(() => {
    const querySearch = searchParams.get('q') ?? '';
    if (querySearch !== globalSearch) {
      setGlobalSearch(querySearch);
    }
  }, [globalSearch, searchParams, setGlobalSearch]);

  useEffect(() => {
    const trimmed = globalSearch.trim();
    const queryValue = searchParams.get('q') ?? '';
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

  const handleFilterChange = (key: 'class' | 'exchange' | 'country' | 'watch', value: string): void => {
    updateParams((params) => {
      const trimmedValue = value.trim();
      if (!trimmedValue || (key === 'watch' && trimmedValue === 'any')) {
        params.delete(key);
      } else {
        params.set(key, trimmedValue);
      }
      params.set('page', '1');
    });
    setPage(1);
  };

  const handleClearFilters = (): void => {
    updateParams((params) => {
      params.delete('class');
      params.delete('exchange');
      params.delete('country');
      params.delete('watch');
      params.set('page', '1');
    });
    setPage(1);
  };

  const combinedSearch = useMemo(() => {
    const filterTokens = [
      assetClass ? `class:${assetClass}` : '',
      exchange ? `exchange:${exchange}` : '',
      country ? `country:${country}` : '',
      watchStatus === 'watching' ? 'watched:true' : '',
      watchStatus === 'not-watching' ? 'watched:false' : ''
    ].filter(Boolean);

    return [presetSearch?.trim(), ...filterTokens, globalSearch.trim()]
      .filter((value) => Boolean(value?.length))
      .join(' ')
      .trim();
  }, [assetClass, country, exchange, globalSearch, presetSearch, watchStatus]);

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
      </header>
      <form className="filter-panel" role="search" aria-label="Catalog filters" onSubmit={(event) => event.preventDefault()}>
        <div className="filter-grid">
          <label className="filter-field" htmlFor="filter-class">
            <span className="filter-label">Asset class</span>
            <input
              id="filter-class"
              type="text"
              value={assetClass}
              onChange={(event) => handleFilterChange('class', event.target.value)}
              placeholder="e.g., equity or crypto"
              className="search-input"
            />
          </label>
          <label className="filter-field" htmlFor="filter-exchange">
            <span className="filter-label">Exchange</span>
            <input
              id="filter-exchange"
              type="text"
              value={exchange}
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
              value={country}
              onChange={(event) => handleFilterChange('country', event.target.value)}
              placeholder="e.g., US"
              className="search-input"
            />
          </label>
          <label className="filter-field" htmlFor="filter-watch">
            <span className="filter-label">Watch status</span>
            <select
              id="filter-watch"
              value={watchStatus}
              onChange={(event) => handleFilterChange('watch', event.target.value)}
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
      <Catalog apiBaseUrl={apiBaseUrl} searchTerm={combinedSearch} page={page} onPageChange={handlePageChange} />
    </section>
  );
}

function AssetClassesIndex(): JSX.Element {
  const featuredClasses = ['equity', 'etf', 'forex', 'crypto'];

  return (
    <section className="page-shell">
      <Breadcrumbs items={[{ label: 'Asset Catalog', path: '/catalog' }, { label: 'Asset Classes' }]} />
      <header className="page-header">
        <p className="page-kicker">Catalog</p>
        <h1>Asset Classes</h1>
        <p className="app-description">Jump into a curated view for each asset class.</p>
      </header>
      <div className="link-grid" role="list">
        {featuredClasses.map((className) => (
          <Link
            key={className}
            className="link-card"
            to={`/catalog/classes/${encodeURIComponent(className)}`}
            role="listitem"
          >
            <span className="link-card-title">{className.toUpperCase()}</span>
            <span className="link-card-subtitle">View {className} instruments</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function AssetClassCatalogPage({ apiBaseUrl }: AppProps): JSX.Element {
  const { className } = useParams<{ className: string }>();
  const classLabel = className ? className.replace(/-/g, ' ') : 'Class';
  const displayName = classLabel ? titleCase(classLabel) : 'Class';

  return (
    <CatalogPage
      apiBaseUrl={apiBaseUrl}
      title={`${displayName} Assets`}
      description={`Assets grouped under the ${displayName} class.`}
      presetSearch={classLabel ? `class:${classLabel}` : ''}
      breadcrumbs={[
        { label: 'Asset Catalog', path: '/catalog' },
        { label: 'Asset Classes', path: '/catalog/classes' },
        { label: displayName || 'Class detail' }
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
      breadcrumbs={[
        { label: 'Asset Catalog', path: '/catalog' },
        { label: 'Regional Views', path: '/catalog/regions' },
        { label: 'United States' }
      ]}
    />
  );
}

function OhlcvVisualizationPage(): JSX.Element {
  return (
    <section className="page-shell">
      <Breadcrumbs items={[{ label: 'Asset Catalog', path: '/catalog' }, { label: 'OHLCV Visualization' }]} />
      <header className="page-header">
        <p className="page-kicker">Analytics</p>
        <h1>OHLCV Visualization</h1>
        <p className="app-description">
          Dive into price and volume data with dedicated OHLCV visualizations. Choose an asset from the catalog to
          begin.
        </p>
      </header>
      <div className="placeholder-card">
        <p>Visualization tools are coming soon. Select an asset from the catalog to explore its OHLCV profile.</p>
      </div>
    </section>
  );
}

function withPortalAuthentication<P extends object>(component: ComponentType<P>): ComponentType<P> {
  return withAuthenticationRequired(component, {
    onRedirecting: () => <GlobalLoadingShell visible message="Redirecting to login…" />,
    returnTo: window.location.pathname
  });
}

const ProtectedCatalogPage = withPortalAuthentication(CatalogPage);
const ProtectedCatalog = withPortalAuthentication(Catalog);
const ProtectedAssetClassesIndex = withPortalAuthentication(AssetClassesIndex);
const ProtectedAssetClassCatalogPage = withPortalAuthentication(AssetClassCatalogPage);
const ProtectedRegionalIndexPage = withPortalAuthentication(RegionalIndexPage);
const ProtectedUsRegionalCatalogPage = withPortalAuthentication(UsRegionalCatalogPage);
const ProtectedOhlcvVisualizationPage = withPortalAuthentication(OhlcvVisualizationPage);

function App({ apiBaseUrl }: AppProps): JSX.Element {
  const { error: authError } = useAuth0();

  return (
    <BrowserRouter>
      <AppErrorBoundary>
        <Routes>
          <Route element={<PortalLayout authError={authError} />}>
            <Route index element={<Navigate to="/catalog" replace />} />
            <Route
              path="catalog"
              element={
                <ProtectedCatalogPage
                  apiBaseUrl={apiBaseUrl}
                  title="Asset Catalog"
                  breadcrumbs={[{ label: 'Asset Catalog' }]}
                />
              }
            />
            <Route path="catalog/classes" element={<ProtectedAssetClassesIndex />} />
            <Route path="catalog/classes/:className" element={<ProtectedAssetClassCatalogPage apiBaseUrl={apiBaseUrl} />} />
            <Route path="catalog/regions" element={<ProtectedRegionalIndexPage />} />
            <Route path="catalog/regions/us" element={<ProtectedUsRegionalCatalogPage apiBaseUrl={apiBaseUrl} />} />
            <Route path="ohlcv" element={<ProtectedOhlcvVisualizationPage />} />
            <Route path="*" element={<Navigate to="/catalog" replace />} />
          </Route>
        </Routes>
      </AppErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
