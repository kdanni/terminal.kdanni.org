-- Forex pairs list 
-- "data": [
--     {
--         "symbol": "EUR/USD",
--         "currency_group": "Major",
--         "currency_base": "EUR",
--         "currency_quote": "USD"
--     }
-- ],

-- SQL table for storing forex pairs metadata
CREATE TABLE IF NOT EXISTS forex_pairs_list (
    symbol          VARCHAR(16)   NOT NULL,        -- Forex pair symbol (e.g. 'EUR/USD')
    currency_group  VARCHAR(32)   NOT NULL,        -- Group of the forex pair (e.g. 'Major', 'Minor')
    currency_base   VARCHAR(8)    NOT NULL,        -- Base currency code (e.g. 'EUR')
    currency_quote  VARCHAR(8)    NOT NULL,         -- Quote currency code (e.g. 'USD')
    PRIMARY KEY (currency_base, currency_quote)  -- Composite primary key on base and quote currency
    , INDEX idx_forex_pairs_list_symbol (symbol),
    INDEX idx_currency_group (currency_group),
    INDEX idx_currency_base (currency_base),
    INDEX idx_currency_quote (currency_quote),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Creation timestamp
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- Update timestamp
    INDEX idx_base_quote (currency_base, currency_quote)
) COLLATE = utf8_hungarian_ci;

-- -- Index for faster lookups by currency group
-- CREATE INDEX idx_currency_group ON forex_pairs_list (currency_group);
-- -- Index for faster lookups by base currency
-- CREATE INDEX idx_currency_base ON forex_pairs_list (currency_base);
-- -- Index for faster lookups by quote currency
-- CREATE INDEX idx_currency_quote ON forex_pairs_list (currency_quote);
-- -- Index for faster lookups by base and quote currency
-- CREATE INDEX idx_base_quote ON forex_pairs_list (currency_base, currency_quote);

-- - Alter table forex_pairs_list to add new columns: created_at, updated_at
-- ALTER TABLE forex_pairs_list
-- ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
-- ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;