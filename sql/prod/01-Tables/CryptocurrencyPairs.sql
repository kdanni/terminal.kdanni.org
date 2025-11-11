-- {
--     "symbol": "BTC/USD",
--     "available_exchanges": [
--         "ABCC",
--         "Allcoin",
--         "BTC-Alpha",
--         "BTCTurk",
--         "Bibox",
--         "n.exchange",
--         "p2pb2b",
--         "xBTCe"
--     ],
--     "currency_base": "Bitcoin",
--     "currency_quote": "US Dollar"
-- }

CREATE TABLE IF NOT EXISTS cryptocurrency_pairs (
    symbol VARCHAR(16) PRIMARY KEY,
    available_exchanges JSON,
    currency_base VARCHAR(32),
    currency_quote VARCHAR(32),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Creation timestamp
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP  -- Update timestamp
);

