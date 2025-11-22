import { useMemo, useState, type KeyboardEvent } from 'react';
import type { Asset, ToggleWatchRequest } from '../types';

const TABLE_COLUMNS: { key: keyof Asset | 'watched'; label: string }[] = [
  { key: 'symbol', label: 'Pair' },
  { key: 'currencyBase', label: 'Base' },
  { key: 'currencyQuote', label: 'Quote' },
  { key: 'type', label: 'Group' },
  { key: 'watched', label: 'Watched' }
];

function normalizeValue(value: unknown): string {
  if (value == null) {
    return '';
  }

  return String(value);
}

function formatValue(value: unknown): string {
  if (value == null || value === '') {
    return '—';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
}

function buildAssetKey(asset: Pick<Asset, 'symbol' | 'exchange'>): string {
  const exchange = normalizeValue(asset.exchange ?? '').trim();
  const normalizedExchange = exchange.length === 0 ? 'na' : exchange;
  return `${asset.symbol}-${normalizedExchange}`;
}

type ForexTableProps = {
  assets?: Asset[];
  loading?: boolean;
  pendingWatchUpdates?: Set<string>;
  onToggleWatch?: (request: ToggleWatchRequest) => void | Promise<void>;
  onRetry?: () => void;
  totalCount?: number;
};

export function ForexTable({
  assets = [],
  loading = false,
  onToggleWatch,
  pendingWatchUpdates,
  onRetry,
  totalCount
}: ForexTableProps): JSX.Element {
  const pendingUpdates = useMemo(() => pendingWatchUpdates ?? new Set<string>(), [pendingWatchUpdates]);
  const [sortConfig, setSortConfig] = useState<
    { key: (typeof TABLE_COLUMNS)[number]['key']; direction: 'asc' | 'desc' | null }
  >({ key: 'symbol', direction: 'asc' });

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
      <div className="table-skeleton" role="status" aria-live="polite" aria-label="Loading forex pairs">
        <div className="table-skeleton-header">Loading forex pairs…</div>
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
        <p>No forex pairs to display yet.</p>
        <p className="app-subtle">Adjust your filters or retry the request.</p>
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
          pairs
        </p>
      </div>
      <table className="asset-table" aria-label="Forex pairs table">
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
            const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>): void => {
              if (!onToggleWatch || isUpdating) {
                return;
              }

              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onToggleWatch({
                  symbol: asset.symbol,
                  exchange: asset.exchange ?? null,
                  watched: !asset.watched,
                  asset
                });
              }
            };

            return (
              <tr
                key={rowKey}
                aria-busy={isUpdating}
                tabIndex={0}
                aria-label={`Forex row for ${asset.symbol}`}
                onKeyDown={handleRowKeyDown}
              >
                <td scope="row">{asset.symbol}</td>
                <td>{formatValue(asset.currencyBase)}</td>
                <td>{formatValue(asset.currencyQuote)}</td>
                <td>{formatValue(asset.type)}</td>
                <td className="watch-cell">
                  <div className="watch-toggle">
                    <span className={`watch-indicator${asset.watched ? ' is-watching' : ''}`} aria-hidden="true">
                      {asset.watched ? '●' : '○'}
                    </span>
                    {onToggleWatch ? (
                      <button
                        type="button"
                        className="ghost-button"
                        disabled={isUpdating}
                        onClick={() =>
                          onToggleWatch({
                            symbol: asset.symbol,
                            exchange: asset.exchange ?? null,
                            watched: !asset.watched,
                            asset
                          })
                        }
                      >
                        {asset.watched ? 'Unwatch' : 'Watch'}
                      </button>
                    ) : (
                      <span className="app-subtle">{asset.watched ? 'Watching' : 'Not watching'}</span>
                    )}
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
