# Watch List Synchronization

The watch list feature is intentionally duplicated between the master data MySQL database and the time-series PostgreSQL (TimescaleDB) database. The MySQL table feeds UI experiences (searchable asset catalog, watched toggle interactions) while the PostgreSQL tables back-fill OHLC data collection jobs. This separation isolates workload-specific schemas while allowing either surface to remain responsive even if the other system is offline.

## Schema Overview

### MySQL (`watch_list`)

* Located in `sql/prod/01-Tables/WatchList.sql`.
* Stores watch list entries for the asset catalog UI with `symbol`, `exchange`, `active`, and timestamp metadata.
* Uses an empty string (`''`) for `exchange` when the symbol is globally scoped to remain compatible with PostgreSQL's `NULL` usage.
* Enforces uniqueness on `(symbol, exchange)` to prevent duplicate entries and adds indexes that accelerate catalog lookups.

### PostgreSQL (`asset_watch_list`)

* Defined in `sql/timescale/01-Tables/asset_watch_list.sql` and managed with helper utilities in `src/postgres/asset-watch-list.mjs`.
* Maintains the authoritative state for ingestion jobs and the historical `asset_watch_history` activity log.

## Synchronization Flow

A one-shot synchronization task keeps both databases aligned:

```bash
npm run watch-list:sync
```

The task performs the following steps:

1. Reads all watch list entries from PostgreSQL and MySQL.
2. Calculates the union of `(symbol, exchange)` keys across both datasets.
3. Inserts missing records into the opposite database.
4. Compares the `active` status; the most recently updated record (based on `updated_at`) wins.
5. Falls back to the PostgreSQL value if timestamps match, ensuring deterministic resolution.

The implementation lives in `src/watch-list/sync.mjs` and uses `src/mysql/watch-list.mjs` for MySQL access alongside the existing PostgreSQL helpers.

## Operational Notes

* Scheduling (cron, timers, etc.) is intentionally out-of-scope—invoke the task whenever synchronization is required.
* The sync task closes its MySQL connection after completion, making it safe to call from CLI tools or automation.
* Adding new watch list functionality should prefer the PostgreSQL helpers in `src/postgres/asset-watch-list.mjs` to benefit from history tracking.
