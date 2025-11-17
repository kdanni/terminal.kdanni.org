import { useMemo } from 'react';
import type { Asset, ToggleWatchRequest } from '../types';

const TABLE_COLUMNS: { key: keyof Asset | 'watched'; label: string }[] = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'name', label: 'Name' },
  { key: 'assetType', label: 'Type' },
  { key: 'exchange', label: 'Exchange' },
  { key: 'currency', label: 'Currency' },
  { key: 'country', label: 'Country' },
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
};

function AssetTable({ assets = [], loading = false, onToggleWatch, pendingWatchUpdates }: AssetTableProps) {
  const pendingUpdates = useMemo(() => pendingWatchUpdates ?? new Set<string>(), [pendingWatchUpdates]);

  if (loading) {
    return <div className="loading-indicator">Loading assets…</div>;
  }

  if (!assets.length) {
    return <div className="empty-state">No assets to display yet.</div>;
  }

  return (
    <div className="table-wrapper">
      <table className="asset-table">
        <thead>
          <tr>
            {TABLE_COLUMNS.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => {
            const rowKey = buildAssetKey(asset);
            const isUpdating = pendingUpdates.has(rowKey);
            return (
              <tr key={rowKey}>
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
                    <span className="watch-toggle-status">
                      {asset.watched ? 'Watching' : 'Not watching'}
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
