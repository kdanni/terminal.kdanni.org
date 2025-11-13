-- {
--     "symbol": "XAU/USD",
--     "name": "Gold Spot",
--     "category": "Precious Metal",
--     "description": ""
-- }

CREATE TABLE IF NOT EXISTS commodities (
    symbol VARCHAR(10) PRIMARY KEY,
    name VARCHAR(512) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Creation timestamp
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- Update timestamp
    INDEX idx_commodities_name (name),
    INDEX idx_commodities_category (category),
    INDEX idx_commodities_symbol (symbol)
);

-- - Alter table commodities to add new columns: created_at, updated_at
-- ALTER TABLE commodities
-- ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
-- ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;