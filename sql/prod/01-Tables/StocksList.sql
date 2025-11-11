-- "data": [
--         {
--             "symbol": "AAPL",
--             "name": "Apple Inc",
--             "currency": "USD",
--             "exchange": "NASDAQ",
--             "mic_code": "XNGS",
--             "country": "United States",
--             "type": "Common Stock",
--             "figi_code": "BBG000B9Y5X2",
--             "cfi_code": "ESVUFR",
--             "isin": "US0378331005",
--             "cusip": "037833100",
--             "access": {
--                 "global": "Level A",
--                 "plan": "Grow"
--             }
--         }
--     ],

-- SQL table for storing stock metadata
CREATE TABLE IF NOT EXISTS stocks_list (
    symbol      VARCHAR(32)    NOT NULL,        -- Asset identifier (e.g. ticker)
    name        VARCHAR(128)   NOT NULL,        -- Full name of the asset
    currency    VARCHAR(8)     NOT NULL,        -- Currency code (e.g. 'USD')
    exchange    VARCHAR(32)    NOT NULL,        -- Exchange name (required for composite key) mic_code    VARCHAR(12),                    -- Market Identifier Code (optional)
    mic_code    VARCHAR(12),                    -- Market Identifier Code (optional)
    country     VARCHAR(64),                    -- Country of the asset
    type        VARCHAR(32),                    -- Type of asset (e.g. 'Common Stock')
    figi_code   VARCHAR(12),                    -- Financial Instrument Global Identifier
    cfi_code    VARCHAR(6),                     -- Classification of Financial Instruments code
    isin        VARCHAR(12),                    -- International Securities Identification Number
    cusip       VARCHAR(9),                     -- Committee on Uniform Securities Identification Procedures code
    access_global VARCHAR(16),                  -- Global access level (e.g. 'Level A')
    access_plan  VARCHAR(16),                   -- Access plan (e.g. 'Grow')
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Creation timestamp
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- Update timestamp
    PRIMARY KEY (symbol, exchange)  -- Composite primary key on symbol and exchange
    , INDEX idx_stocks_list_symbol (symbol),
    INDEX idx_stocks_list_exchange (exchange),
    INDEX idx_stocks_list_country (country),
    INDEX idx_stocks_list_type (type),
    INDEX idx_stocks_list_isin (isin),
    INDEX idx_stocks_list_access_global (access_global),
    INDEX idx_stocks_list_access_plan (access_plan),
    INDEX idx_stocks_list_currency (currency),
    INDEX idx_stocks_list_symbol_exchange (symbol, exchange)
) COLLATE = utf8_hungarian_ci;

-- CREATE INDEX idx_stocks_list_symbol ON stocks_list (symbol);
-- CREATE INDEX idx_stocks_list_exchange ON stocks_list (exchange);
-- CREATE INDEX idx_stocks_list_country ON stocks_list (country);
-- CREATE INDEX idx_stocks_list_type ON stocks_list (type);
-- CREATE INDEX idx_stocks_list_isin ON stocks_list (isin);
-- CREATE INDEX idx_stocks_list_access_global ON stocks_list (access_global);
-- CREATE INDEX idx_stocks_list_access_plan ON stocks_list (access_plan);
-- CREATE INDEX idx_stocks_list_currency ON stocks_list (currency);
-- CREATE INDEX idx_stocks_list_symbol_exchange ON stocks_list (symbol, exchange);


-- - Alter stocks_list table to add new columns: created_at, updated_at
-- ALTER TABLE stocks_list
-- ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
-- ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;