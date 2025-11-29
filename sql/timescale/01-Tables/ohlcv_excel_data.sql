CREATE TABLE IF NOT EXISTS ohlcv_excel_data (
    symbol      VARCHAR(32)    NOT NULL,        -- Asset identifier (e.g. ticker)
    time        TIMESTAMPTZ    NOT NULL,        -- Timestamp (UTC recommended)
    open        NUMERIC(18,6)  NOT NULL,        -- Opening price
    high        NUMERIC(18,6)  NOT NULL,        -- Highest price
    low         NUMERIC(18,6)  NOT NULL,        -- Lowest price
    close       NUMERIC(18,6)  NOT NULL,        -- Closing price
    volume      BIGINT         NOT NULL,        -- Trading volume
    PRIMARY KEY (symbol, time)
);

-- Convert to hypertable for TimescaleDB
SELECT create_hypertable('ohlcv_excel_data', 'time', if_not_exists => TRUE);
