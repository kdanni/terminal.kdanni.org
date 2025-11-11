-- {
--     "symbol": "US2Y",
--     "name": "US Treasury Yield 2 Years",
--     "country": "United States",
--     "currency": "USD",
--     "exchange": "NYSE",
--     "mic_code": "XNYS",
--     "type": "Bond",
--     "access": {
--         "global": "Basic",
--         "plan": "Basic"
--     }
-- }

CREATE TABLE IF NOT EXISTS fixed_income (
    symbol VARCHAR(16) PRIMARY KEY,
    name VARCHAR(255),
    country VARCHAR(100),
    currency VARCHAR(10),
    exchange VARCHAR(50),
    mic_code VARCHAR(10),
    type VARCHAR(50),
    access_global VARCHAR(20),
    access_plan VARCHAR(20),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Creation timestamp
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP  -- Update timestamp
);
