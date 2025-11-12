CREATE TABLE IF NOT EXISTS securities (
  id              BIGSERIAL PRIMARY KEY,
  symbol          TEXT NOT NULL,
  name            TEXT NOT NULL,
  exchange_id     BIGINT REFERENCES exchanges(id),
  currency_code   TEXT NOT NULL REFERENCES currencies(code),
  type            TEXT NOT NULL CHECK (type IN (
                       'equity','etf','index','fx','crypto','future','bond','fund','other')),
  isin            TEXT UNIQUE,
  cusip           TEXT UNIQUE,
  figi            TEXT UNIQUE,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
