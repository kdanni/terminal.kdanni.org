-- {
--     "symbol": "DIVI",
--     "name": "AdvisorShares Athena High Dividend ETF",
--     "country": "United States",
--     "currency": "USD",
--     "exchange": "NYSE",
--     "mic_code": "ARCX",
--     "type": "ETF",
--     "figi_code": "BBG00161BCW4",
--     "cfi_code": "CECILU",
--     "isin": "GB00B65TLW28",
--     "cusip": "35473P108",
--     "access": {
--         "global": "Basic",
--         "plan": "Basic"
--     }
-- }

CREATE TABLE IF NOT EXISTS funds (
    symbol VARCHAR(10) PRIMARY KEY,
    name VARCHAR(512) NOT NULL,
    country VARCHAR(50) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    exchange VARCHAR(50) NOT NULL,
    mic_code VARCHAR(10) NOT NULL,
    type VARCHAR(50) NOT NULL,
    figi_code VARCHAR(12) NOT NULL,
    cfi_code VARCHAR(6) NOT NULL,
    isin VARCHAR(255) NOT NULL,
    cusip VARCHAR(255) NOT NULL,
    access_global VARCHAR(20) NOT NULL,
    access_plan VARCHAR(20) NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Creation timestamp
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP  -- Update timestamp
);
