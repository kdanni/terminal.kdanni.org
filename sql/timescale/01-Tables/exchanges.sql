-- Schema derived from Twelve Data exchange catalog payloads such as:
-- {
--   "code": "NYSE",
--   "name": "New York Stock Exchange",
--   "country": "United States",
--   "city": "New York",
--   "timezone": "America/New_York",
--   "currency": "USD",
--   "mic_code": "XNYS",
--   "acronym": "NYSE",
--   "website": "https://www.nyse.com",
--   "phone": "+1 212-656-3000",
--   "address": "11 Wall Street, New York, NY"
-- }

CREATE TABLE IF NOT EXISTS exchanges_catalog (
    code            VARCHAR(32)    NOT NULL,   -- Exchange identifier supplied by the provider
    name            VARCHAR(255)   NOT NULL,   -- Human readable exchange name
    country         VARCHAR(128)   NULL,       -- Country hosting the exchange
    city            VARCHAR(128)   NULL,       -- City of the exchange headquarters
    timezone        VARCHAR(64)    NULL,       -- Olson timezone identifier
    currency        VARCHAR(16)    NULL,       -- Primary trading currency
    mic_code        VARCHAR(16)    NULL,       -- ISO 10383 Market Identifier Code
    acronym         VARCHAR(64)    NULL,       -- Common short name
    website         VARCHAR(255)   NULL,       -- Primary website URL
    phone           VARCHAR(64)    NULL,       -- Main contact phone number
    address         VARCHAR(255)   NULL,       -- Physical address or mailing address
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
