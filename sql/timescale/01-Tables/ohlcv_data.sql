CREATE TABLE ohlcv_data (
    symbol      VARCHAR(32)    NOT NULL,        -- Asset identifier (e.g. ticker)
    exchange    VARCHAR(32),                    -- Exchange name (optional)
    interval    VARCHAR(16)    NOT NULL,        -- Bar interval (e.g. '1d', '1m')
    time        TIMESTAMPTZ    NOT NULL,        -- Timestamp (UTC recommended)
    open        NUMERIC(18,6)  NOT NULL,        -- Opening price
    high        NUMERIC(18,6)  NOT NULL,        -- Highest price
    low         NUMERIC(18,6)  NOT NULL,        -- Lowest price
    close       NUMERIC(18,6)  NOT NULL,        -- Closing price
    volume      BIGINT         NOT NULL,        -- Trading volume
    PRIMARY KEY (symbol, interval, time)
);

-- Convert to hypertable for TimescaleDB
SELECT create_hypertable('ohlcv_data', 'time');