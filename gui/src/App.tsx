import {
  Component,
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
  useParams
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

function Catalog({ apiBaseUrl, searchTerm }: CatalogProps): JSX.Element {
  const [page, setPage] = useState(1);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const [pendingWatchUpdates, setPendingWatchUpdates] = useState<Set<string>>(() => new Set());
  const { fetchWithAuth } = useApiClient(apiBaseUrl);

  useEffect(() => {
    const controller = new AbortController();
    const trimmedSearch = searchTerm.trim();

    async function loadAssets(): Promise<void> {
      setLoading(true);
      setError(null);

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
      } finally {
        setLoading(false);
      }
    }

    loadAssets();

    return () => controller.abort();
  }, [apiBaseUrl, fetchWithAuth, searchTerm, page]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

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
    setPage((current) => Math.max(1, current - 1));
  };

  const goToNextPage = (): void => {
    setPage((current) => Math.min(totalPages || current + 1, current + 1));
  };

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
      </div>
      <main>
        {error ? (
          <div role="alert" className="error-message">
            {error.message || 'Unknown error occurred.'}
          </div>
        ) : null}
        {actionError && !error ? (
          <div role="alert" className="error-message">
            {actionError.message || 'Failed to update the watch status.'}
          </div>
        ) : null}
        <AssetTable
          assets={assets}
          loading={loading && assets.length === 0}
          onToggleWatch={handleToggleWatch}
          pendingWatchUpdates={pendingWatchUpdates}
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
  const { globalSearch } = useOutletContext<PortalOutletContext>();
  const combinedSearch = useMemo(
    () =>
      [presetSearch?.trim(), globalSearch.trim()]
        .filter((value) => Boolean(value?.length))
        .join(' ')
        .trim(),
    [presetSearch, globalSearch]
  );
  const headerDescription =
    description ?? 'Browse the asset catalog and refine the results with the global search bar above.';

  return (
    <section className="page-shell">
      <Breadcrumbs items={breadcrumbs} />
      <header className="page-header">
        <p className="page-kicker">Asset Catalog</p>
        <h1>{title}</h1>
        {headerDescription ? <p className="app-description">{headerDescription}</p> : null}
      </header>
      <Catalog apiBaseUrl={apiBaseUrl} searchTerm={combinedSearch} />
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
