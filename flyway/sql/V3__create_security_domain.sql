-- Domain tables for securities, symbol mappings, and corporate actions.
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_securities_exchange_symbol
  ON securities (exchange_id, symbol)
  WHERE exchange_id IS NOT NULL;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS
$$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_securities_updated_at ON securities;
CREATE TRIGGER trg_securities_updated_at
BEFORE UPDATE ON securities
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS symbols (
  id            BIGSERIAL PRIMARY KEY,
  security_id   BIGINT NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  provider_id   BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  provider_sym  TEXT NOT NULL,
  UNIQUE (provider_id, provider_sym)
);

CREATE INDEX IF NOT EXISTS ix_symbols_security ON symbols (security_id);

CREATE TABLE IF NOT EXISTS corporate_actions (
  id            BIGSERIAL PRIMARY KEY,
  security_id   BIGINT NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  action_date   DATE NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('split','dividend','symbol_change')),
  factor_num    NUMERIC(18,8),
  factor_den    NUMERIC(18,8),
  cash_amount   NUMERIC(18,8),
  currency_code TEXT REFERENCES currencies(code),
  note          TEXT
);

CREATE INDEX IF NOT EXISTS ix_corp_actions_sec_date
  ON corporate_actions (security_id, action_date);
