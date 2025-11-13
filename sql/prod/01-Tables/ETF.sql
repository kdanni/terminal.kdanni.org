-- {
--     "symbol": "SPY",
--     "name": "SPDR S&P 500 ETF Trust",
--     "currency": "USD",
--     "exchange": "NYSE",
--     "mic_code": "ARCX",
--     "country": "United States",
--     "figi_code": "BBG000BDTF76",
--     "cfi_code": "CECILU",
--     "isin": "US78462F1030",
--     "cusip": "037833100",
--     "access": {
--         "global": "Basic",
--         "plan": "Basic"
--     }
-- }

-- - CREATE IF exist table for ETF data

CREATE TABLE IF NOT EXISTS etf (
    symbol VARCHAR(10) PRIMARY KEY,
    name VARCHAR(512),
    currency VARCHAR(10),
    exchange VARCHAR(50),
    mic_code VARCHAR(10),
    country VARCHAR(50),
    figi_code VARCHAR(12),
    cfi_code VARCHAR(6),
    isin VARCHAR(255),
    cusip VARCHAR(255),
    access_global VARCHAR(20),
    access_plan VARCHAR(20),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Creation timestamp
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP  -- Update timestamp
);
