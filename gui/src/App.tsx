import {
  Component,
  useEffect,
  useMemo,
  useState,
  type ErrorInfo,
  type FormEvent,
  type ReactNode
} from 'react';
import AssetTable from './components/AssetTable';
import type { Asset, ToggleWatchRequest } from './types';

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

function App({ apiBaseUrl }: AppProps): JSX.Element {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const [pendingWatchUpdates, setPendingWatchUpdates] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const controller = new AbortController();

    async function loadAssets(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          buildApiUrl({ baseUrl: apiBaseUrl, search, page, pageSize: DEFAULT_PAGE_SIZE }),
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`Failed to load assets: ${response.status}`);
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
        setError(fetchError instanceof Error ? fetchError : new Error('Failed to load assets'));
        setAssets([]);
        setTotal(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    }

    loadAssets();

    return () => controller.abort();
  }, [apiBaseUrl, search, page]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const description = useMemo(() => {
    if (loading) {
      return 'Loading asset catalog…';
    }

    if (error) {
      return 'Unable to load assets from the catalog.';
    }

    if (!assets.length) {
      return 'No assets match the current filters yet.';
    }

    return `Showing ${assets.length} of ${total} assets`;
  }, [loading, error, assets, total]);

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

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
      const response = await fetch(`${apiBaseUrl}/api/watch-list/toggle`, {
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
        throw new Error(`Failed to update watch status: ${response.status}`);
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
      setActionError(toggleError instanceof Error ? toggleError : new Error('Failed to update watch status'));
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
    <AppErrorBoundary>
      <div className="app-shell" aria-busy={loading}>
        <GlobalLoadingShell visible={isInitialLoad} message="Loading asset catalog…" />
        <header className="app-header">
          <h1>Asset Catalog</h1>
          <p className="app-description">{description}</p>
          <form className="search-form" onSubmit={onSubmit}>
            <label className="search-label" htmlFor="asset-search">
              Search by symbol, name, exchange, or currency
            </label>
            <div className="search-input-group">
              <input
                id="asset-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search assets…"
                className="search-input"
                autoComplete="off"
              />
              <button type="submit" className="search-button" disabled={loading}>
                Apply
              </button>
            </div>
          </form>
        </header>
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
    </AppErrorBoundary>
  );
}

export default App;
