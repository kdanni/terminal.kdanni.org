import { useMemo, useState } from 'react';
import type { Asset, ToggleWatchRequest } from '../types';

const TABLE_COLUMNS: { key: keyof Asset | 'watched'; label: string }[] = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'name', label: 'Name' },
  { key: 'assetType', label: 'Type' },
  { key: 'exchange', label: 'Exchange' },
  { key: 'currency', label: 'Currency' },
  { key: 'country', label: 'Country/Region' },
  { key: 'type', label: 'Category' },
  { key: 'watched', label: 'Watched' }
];

function formatValue(value: unknown): string {
  if (value == null || value === '') {
    return '—';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
}

function buildAssetKey(asset: Asset | null): string {
  if (!asset) {
    return 'asset-row';
  }

  const exchange = asset.exchange == null ? '' : String(asset.exchange).trim();
  const normalizedExchange = exchange.length === 0 ? 'na' : exchange;
  return `${asset.symbol}-${normalizedExchange}`;
}

type AssetTableProps = {
  assets?: Asset[];
  loading?: boolean;
  pendingWatchUpdates?: Set<string>;
  onToggleWatch?: (request: ToggleWatchRequest) => void | Promise<void>;
  onRetry?: () => void;
  totalCount?: number;
};

function AssetTable({
  assets = [],
  loading = false,
  onToggleWatch,
  pendingWatchUpdates,
  onRetry,
  totalCount
}: AssetTableProps) {
  const pendingUpdates = useMemo(() => pendingWatchUpdates ?? new Set<string>(), [pendingWatchUpdates]);
  const [sortConfig, setSortConfig] = useState<{ key: (typeof TABLE_COLUMNS)[number]['key']; direction: 'asc' | 'desc' | null }>(
    { key: 'symbol', direction: 'asc' }
  );

  const handleSort = (key: (typeof TABLE_COLUMNS)[number]['key']): void => {
    setSortConfig((current) => {
      const isSameColumn = current.key === key;
      const nextDirection: 'asc' | 'desc' = isSameColumn && current.direction === 'asc' ? 'desc' : 'asc';
      return { key, direction: nextDirection };
    });
  };

  const sortedAssets = useMemo(() => {
    if (!sortConfig.direction) {
      return assets;
    }

    const normalizeValue = (value: unknown): string | number | boolean => {
      if (value == null) return '';
      if (typeof value === 'boolean' || typeof value === 'number') return value;
      return String(value).toLowerCase();
    };

    return [...assets].sort((a, b) => {
      const aValue = normalizeValue((a as Record<string, unknown>)[sortConfig.key]);
      const bValue = normalizeValue((b as Record<string, unknown>)[sortConfig.key]);

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [assets, sortConfig]);

  const renderSkeletonRows = (): JSX.Element => {
    const skeletonRows = Array.from({ length: 5 });
    return (
      <div className="table-skeleton" role="status" aria-live="polite" aria-label="Loading assets">
        <div className="table-skeleton-header">Loading assets…</div>
        {skeletonRows.map((_, index) => (
          <div className="table-skeleton-row" key={`skeleton-${index}`}>
            {TABLE_COLUMNS.map((column) => (
              <span className="skeleton-cell" key={`${column.key}-${index}`} />
            ))}
          </div>
        ))}
      </div>
    );
  };

  const hasAssets = assets.length > 0;

  if (loading && !hasAssets) {
    return renderSkeletonRows();
  }

  if (!hasAssets) {
    return (
      <div className="empty-state" role="status" aria-live="polite">
        <p>No assets to display yet.</p>
        <p className="app-subtle">Adjust your filters or try fetching the latest catalog.</p>
        {onRetry ? (
          <button type="button" className="secondary-button" onClick={onRetry}>
            Retry search
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="table-wrapper" aria-busy={loading}>
      <div className="table-toolbar" aria-live="polite">
        <p className="table-count">
          Displaying <strong>{assets.length}</strong>
          {typeof totalCount === 'number' ? (
            <>
              {' '}
              of <strong>{totalCount}</strong>
            </>
          ) : null}{' '}
          assets
        </p>
      </div>
      <table className="asset-table">
        <thead>
          <tr>
            {TABLE_COLUMNS.map((column) => {
              const isSortedColumn = sortConfig.key === column.key;
              const ariaSort = isSortedColumn ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none';

              return (
                <th key={column.key} scope="col" aria-sort={ariaSort}>
                  <button
                    type="button"
                    className="table-sort"
                    onClick={() => handleSort(column.key)}
                    aria-label={`Sort by ${column.label}`}
                  >
                    <span>{column.label}</span>
                    <span aria-hidden="true" className="sort-indicator">
                      {isSortedColumn ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedAssets.map((asset) => {
            const rowKey = buildAssetKey(asset);
            const isUpdating = pendingUpdates.has(rowKey);
            return (
              <tr key={rowKey} aria-busy={isUpdating}>
                <td>{asset.symbol}</td>
                <td>{asset.name}</td>
                <td>
                  <span className="asset-type-badge">{formatValue(asset.assetType)}</span>
                </td>
                <td>{formatValue(asset.exchange)}</td>
                <td>{formatValue(asset.currency)}</td>
                <td>{formatValue(asset.country)}</td>
                <td>{formatValue(asset.type ?? asset.category)}</td>
                <td className="watch-cell">
                  <div className="watch-toggle">
                    <input
                      id={`watch-toggle-${rowKey}`}
                      type="checkbox"
                      checked={Boolean(asset.watched)}
                      disabled={Boolean(isUpdating)}
                      aria-label={`Toggle watch status for ${asset.symbol}`}
                      onChange={(event) =>
                        onToggleWatch?.({
                          symbol: asset.symbol,
                          exchange: asset.exchange ?? null,
                          watched: event.target.checked,
                          asset
                        })
                      }
                    />
                    {isUpdating ? <span className="watch-toggle-spinner" aria-hidden="true" /> : null}
                    <span className="watch-toggle-status" aria-live="polite">
                      {isUpdating ? 'Updating…' : asset.watched ? 'Watching' : 'Not watching'}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default AssetTable;
