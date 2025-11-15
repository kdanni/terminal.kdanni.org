import { useEffect, useMemo, useState } from 'react';
import AssetTable from './components/AssetTable.jsx';

const DEFAULT_PAGE_SIZE = 25;

function buildApiUrl({ search, page, pageSize }) {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (search) {
    params.set('search', search);
  }

  return `${baseUrl}/api/assets?${params.toString()}`;
}

function App() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [assets, setAssets] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAssets() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          buildApiUrl({ search, page, pageSize: DEFAULT_PAGE_SIZE }),
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`Failed to load assets: ${response.status}`);
        }

        const payload = await response.json();
        setAssets(payload?.data ?? []);
        setTotal(payload?.pagination?.total ?? 0);
        setTotalPages(payload?.pagination?.totalPages ?? 0);
      } catch (fetchError) {
        if (fetchError.name === 'AbortError') {
          return;
        }
        console.error(fetchError);
        setError(fetchError);
        setAssets([]);
        setTotal(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    }

    loadAssets();

    return () => controller.abort();
  }, [search, page]);

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

  const onSubmit = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  const goToPreviousPage = () => {
    setPage((current) => Math.max(1, current - 1));
  };

  const goToNextPage = () => {
    setPage((current) => Math.min(totalPages || current + 1, current + 1));
  };

  return (
    <div className="app-shell">
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
            />
            <button type="submit" className="search-button">
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
        <AssetTable assets={assets} loading={loading} />
      </main>
      <footer className="pagination">
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

export default App;
