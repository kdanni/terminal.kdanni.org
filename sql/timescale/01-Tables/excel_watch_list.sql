CREATE TABLE IF NOT EXISTS excel_watch_list (
    id SERIAL NOT NULL,
    excel_symbol VARCHAR(128) PRIMARY KEY,
    symbol VARCHAR(64) NOT NULL,
    exchange VARCHAR(64),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS excel_watch_list_symbol_exchange_idx
    ON asset_watch_list (symbol, COALESCE(exchange, ''));
