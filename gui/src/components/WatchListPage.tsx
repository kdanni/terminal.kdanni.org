import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs';
import { ApiError, useApiClient } from '../apiClient';
import { logError } from '../errorReporting';
import type { WatchListEntry, WatchListResponse } from '../types';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 200;

function normalizeExchangeValue(value?: string | null): string {
  if (value == null) {
    return '';
  }

  const trimmed = String(value).trim();
  return trimmed.length === 0 ? '' : trimmed;
}

function buildWatchKey(entry: Pick<WatchListEntry, 'symbol' | 'exchange'>): string {
  const normalizedExchange = normalizeExchangeValue(entry.exchange);
  return `${entry.symbol}-${normalizedExchange || 'na'}`;
}

function isWatchListResponse(payload: unknown): payload is WatchListResponse {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const data = (payload as Record<string, unknown>).data;
  const pagination = (payload as Record<string, unknown>).pagination as
    | { total?: unknown; page?: unknown; pageSize?: unknown }
    | undefined;

  const validPagination =
    pagination === undefined ||
    (typeof pagination.total === 'number' || pagination.total === undefined) &&
      (typeof pagination.page === 'number' || pagination.page === undefined) &&
      (typeof pagination.pageSize === 'number' || pagination.pageSize === undefined);

  return Array.isArray(data) && validPagination;
}

type WatchListPageProps = {
  apiBaseUrl: string;
};

export function WatchListPage({ apiBaseUrl }: WatchListPageProps): JSX.Element {
  const { fetchWithAuth } = useApiClient(apiBaseUrl);
  const [watchList, setWatchList] = useState<WatchListEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncError, setSyncError] = useState<Error | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const [pendingRows, setPendingRows] = useState<Set<string>>(() => new Set());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(() => new Set());
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const applyToEntries = useCallback(
    (targetKeys: string[], updater: (entry: WatchListEntry) => WatchListEntry): void => {
      setWatchList((current) =>
        current.map((entry) => (targetKeys.includes(buildWatchKey(entry)) ? updater(entry) : entry))
      );
    },
    []
  );

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Asset Catalog', path: '/catalog' },
    { label: 'My Watch List' }
  ];

  const handleSync = useCallback(async () => {
    setLoading(true);
    setSyncError(null);

    try {
      const response = await fetchWithAuth(
        `${apiBaseUrl}/api/watch-list?page=${DEFAULT_PAGE}&pageSize=${DEFAULT_PAGE_SIZE}`
      );

      if (!response.ok) {
        throw new ApiError(`Failed to load watch list: ${response.status}`, response.status);
      }

      const payload = (await response.json()) as unknown;

      if (!isWatchListResponse(payload)) {
        throw new ApiError('Unexpected response format from the watch list API.');
      }

      setWatchList(payload.data ?? []);
      setTotalCount(payload.pagination?.total ?? payload.data.length ?? null);
      setSelectedRows(new Set());
      setPendingRows(new Set());
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error('Unable to load the watch list right now.');
      setSyncError(normalizedError);
      logError(error, { source: 'watch-list-sync' });
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, fetchWithAuth]);

  useEffect(() => {
    handleSync();
  }, [handleSync]);

  useEffect(() => {
    if (!selectAllRef.current) {
      return;
    }

    selectAllRef.current.indeterminate =
      selectedRows.size > 0 && selectedRows.size !== watchList.length;
  }, [selectedRows.size, watchList.length]);

  const toggleRowSelection = (rowKey: string, nextValue: boolean): void => {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (nextValue) {
        next.add(rowKey);
      } else {
        next.delete(rowKey);
      }
      return next;
    });
  };

  const toggleAllSelection = (checked: boolean): void => {
    if (!checked) {
      setSelectedRows(new Set());
      return;
    }

    const keys = watchList.map((entry) => buildWatchKey(entry));
    setSelectedRows(new Set(keys));
  };

  const setRowPending = (keys: string[], pending: boolean): void => {
    setPendingRows((current) => {
      const next = new Set(current);
      for (const key of keys) {
        if (pending) {
          next.add(key);
        } else {
          next.delete(key);
        }
      }
      return next;
    });
  };

  const toggleEntries = useCallback(
    async (targets: WatchListEntry[], nextWatched: boolean): Promise<void> => {
      if (!targets.length) {
        return;
      }

      const targetKeys = targets.map((entry) => buildWatchKey(entry));
      const rollbackSnapshot = watchList.map((entry) => ({ ...entry }));

      setActionError(null);
      setRowPending(targetKeys, true);
      applyToEntries(targetKeys, (entry) => ({
        ...entry,
        watched: nextWatched,
        updatedAt: new Date().toISOString()
      }));

      try {
        await Promise.all(
          targets.map(async (entry) => {
            const response = await fetchWithAuth(`${apiBaseUrl}/api/watch-list/toggle`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                symbol: entry.symbol,
                exchange: normalizeExchangeValue(entry.exchange) || null,
                watched: nextWatched
              })
            });

            if (!response.ok) {
              throw new ApiError(`Failed to update ${entry.symbol}`, response.status);
            }

            const payload = (await response.json()) as { data?: Partial<WatchListEntry> & { watchListId?: number | string } };

            applyToEntries([buildWatchKey(entry)], (candidate) => ({
              ...candidate,
              watched: payload?.data?.watched ?? nextWatched,
              watchListId: payload?.data?.watchListId ?? candidate.watchListId,
              updatedAt: payload?.data?.updatedAt ?? candidate.updatedAt
            }));
          })
        );
      } catch (error) {
        setWatchList(rollbackSnapshot);
        const normalized = error instanceof Error ? error : new Error('Failed to update watch list');
        setActionError(normalized);
        logError(error, { source: 'watch-list-toggle', count: targets.length });
      } finally {
        setRowPending(targetKeys, false);
      }
    },
    [apiBaseUrl, applyToEntries, fetchWithAuth, watchList]
  );

  const handleBulkUnwatch = async (): Promise<void> => {
    const targets = watchList.filter((entry) => selectedRows.has(buildWatchKey(entry)));
    if (!targets.length) {
      return;
    }

    setBulkUpdating(true);
    try {
      await toggleEntries(targets, false);
    } finally {
      setBulkUpdating(false);
      setSelectedRows(new Set());
    }
  };

  const handleRowToggle = async (entry: WatchListEntry, watched: boolean): Promise<void> => {
    await toggleEntries([entry], watched);
  };

  const formattedCount = useMemo(() => {
    const total = totalCount ?? watchList.length;
    const activeCount = watchList.filter((entry) => entry.watched).length;
    const suffix = total !== watchList.length ? ` / ${total}` : '';
    return `${activeCount} watching / ${watchList.length}${suffix}`;
  }, [totalCount, watchList]);

  const renderTable = (): JSX.Element => {
    if (!watchList.length && !loading) {
      return (
        <div className="empty-state" role="status">
          <p>Your watch list is empty.</p>
          <p className="app-subtle">Toggle the bookmark switch in the asset catalog to track symbols here.</p>
        </div>
      );
    }

    return (
      <div className="table-wrapper" aria-busy={loading}>
        <table className="asset-table watch-list-table">
          <thead>
            <tr>
              <th scope="col" aria-label="Select all">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  aria-label="Select all watch list rows"
                  checked={selectedRows.size > 0 && selectedRows.size === watchList.length}
                  onChange={(event) => toggleAllSelection(event.target.checked)}
                  disabled={loading || bulkUpdating}
                />
              </th>
              <th scope="col">Symbol</th>
              <th scope="col">Exchange</th>
              <th scope="col">Last Updated</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {watchList.map((entry) => {
              const rowKey = buildWatchKey(entry);
              const isSelected = selectedRows.has(rowKey);
              const isPending = pendingRows.has(rowKey);
              return (
                <tr key={rowKey} aria-busy={isPending}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${entry.symbol}`}
                      checked={isSelected}
                      disabled={bulkUpdating || isPending}
                      onChange={(event) => toggleRowSelection(rowKey, event.target.checked)}
                    />
                  </td>
                  <td>{entry.symbol}</td>
                  <td>{entry.exchange || '—'}</td>
                  <td>{entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : '—'}</td>
                  <td>
                    <div className="watch-toggle-cell">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={entry.watched}
                          disabled={bulkUpdating || isPending}
                          onChange={(event) => handleRowToggle(entry, event.target.checked)}
                        />
                        <span
                          className={`watch-status-chip ${
                            isPending ? 'chip-pending' : entry.watched ? 'chip-active' : 'chip-inactive'
                          }`}
                        >
                          {isPending ? 'Syncing…' : entry.watched ? 'Watching' : 'Not watching'}
                        </span>
                      </label>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <section className="page-shell">
      <Breadcrumbs items={breadcrumbs} />
      <header className="page-header">
        <p className="page-kicker">Watch list</p>
        <h1>My Watch List</h1>
        <p className="app-description">
          Review and bulk-manage the symbols you are tracking in the asset catalog.
        </p>
      </header>

      {syncError ? (
        <div role="alert" className="error-message">
          {syncError.message}
          <div className="inline-actions">
            <button type="button" className="secondary-button" onClick={handleSync}>
              Retry sync
            </button>
          </div>
        </div>
      ) : null}

      {actionError ? (
        <div role="alert" className="error-message">
          {actionError.message}
        </div>
      ) : null}

      <div className="watch-list-toolbar" aria-live="polite">
        <div className="watch-list-meta">
          <p className="app-subtle">Synced entries</p>
          <p className="meta-value">{formattedCount}</p>
        </div>
        <div className="watch-list-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={handleSync}
            disabled={loading || bulkUpdating}
          >
            Refresh list
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={handleBulkUnwatch}
            disabled={selectedRows.size === 0 || bulkUpdating}
          >
            Stop watching selected
          </button>
        </div>
      </div>

      {renderTable()}
    </section>
  );
}
