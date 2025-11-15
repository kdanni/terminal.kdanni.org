CREATE TABLE IF NOT EXISTS asset_watch_list (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(64) NOT NULL,
    exchange VARCHAR(64),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS asset_watch_list_symbol_exchange_idx
    ON asset_watch_list (symbol, COALESCE(exchange, ''));

CREATE TABLE IF NOT EXISTS asset_watch_history (
    id SERIAL PRIMARY KEY,
    watch_list_id INTEGER NOT NULL REFERENCES asset_watch_list(id) ON DELETE CASCADE,
    active_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    inactive_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS asset_watch_history_watch_list_id_idx
    ON asset_watch_history (watch_list_id, active_from DESC);
