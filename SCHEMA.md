# SCHEMA.md

This document defines the relational/time-series schema for the personal-market-data platform built on **PostgreSQL + TimescaleDB**. It covers entities, constraints, indexes, hypertables, retention/compression, and example queries.

---

## Conventions

- **Timestamps** are UTC (`timestamptz`).
- **IDs** are `bigserial` unless otherwise stated.
- Symbols are resolved via a **symbol registry** to a canonical `security_id`.
- All OHLCV numeric fields use `numeric(18,8)` unless noted.
- Text enums use check constraints for portability.

---

## Entity Overview

```
exchanges ─┐
           ├── securities ──┬── symbols (per provider)
providers ─┘                 └── corporate_actions (splits/dividends)
currencies ─────────────────────────────────┘
price_series (hypertable) ← securities
fx_rates    (hypertable) ← currencies
econ_series (hypertable) ← macro series catalog
```

---

## Reference Tables

### `exchanges`
Metadata for trading venues.

```sql
CREATE TABLE exchanges (
  id            bigserial PRIMARY KEY,
  code          text NOT NULL UNIQUE,          -- e.g., "NYSE", "NASDAQ", "XETR"
  name          text NOT NULL,
  country       text NOT NULL,                 -- ISO-3166 alpha-2/3 or plain text
  timezone      text NOT NULL,                 -- IANA TZ, e.g., "America/New_York"
  mic           text UNIQUE                    -- market identifier code
);
```

### `currencies`
Currency metadata.

```sql
CREATE TABLE currencies (
  code          text PRIMARY KEY,              -- ISO-4217, e.g., "USD"
  name          text NOT NULL,
  decimals      smallint NOT NULL CHECK (decimals BETWEEN 0 AND 8)
);
```

### `providers`
External/free-tier data sources.

```sql
CREATE TABLE providers (
  id            bigserial PRIMARY KEY,
  code          text NOT NULL UNIQUE,          -- e.g., "alpha_vantage", "yahoo", "fred"
  name          text NOT NULL,
  base_url      text NOT NULL
);
```

---

## Core Domain Tables

### `securities`
Canonical instruments; one row per real-world asset.

```sql
CREATE TABLE securities (
  id              bigserial PRIMARY KEY,
  symbol          text NOT NULL,               -- canonical symbol (local to exchange)
  name            text NOT NULL,
  exchange_id     bigint REFERENCES exchanges(id),
  currency_code   text NOT NULL REFERENCES currencies(code),
  type            text NOT NULL CHECK (type IN (
                     'equity','etf','index','fx','crypto','future','bond','fund','other')),
  isin            text UNIQUE,
  cusip           text UNIQUE,
  figi            text UNIQUE,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_securities_exchange_symbol
  ON securities (exchange_id, symbol)
  WHERE exchange_id IS NOT NULL;

CREATE TRIGGER trg_securities_updated_at
BEFORE UPDATE ON securities
FOR EACH ROW EXECUTE FUNCTION
  pg_catalog.trigger_set_timestamp(); -- Uses builtin or custom function to set updated_at
```

## `symbols`
Provider-specific symbol mapping back to `security_id`.

```sql
CREATE TABLE symbols (
  id            bigserial PRIMARY KEY,
  security_id   bigint NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  provider_id   bigint NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  provider_sym  text NOT NULL,
  unique (provider_id, provider_sym)
);

CREATE INDEX ix_symbols_security ON symbols (security_id);
```

## `corporate_actions`
Splits and dividends; extendable for other actions.

```sql
CREATE TABLE corporate_actions (
  id            bigserial PRIMARY KEY,
  security_id   bigint NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  action_date   date NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('split','dividend','symbol_change')),
  factor_num    numeric(18,8),                 -- for splits: new
  factor_den    numeric(18,8),                 -- for splits: old
  cash_amount   numeric(18,8),                 -- for dividends
  currency_code text REFERENCES currencies(code),
  note          text
);

CREATE INDEX ix_corp_actions_sec_date ON corporate_actions (security_id, action_date);
```


# Time-Series Tables (TimescaleDB)
Run `CREATE EXTENSION IF NOT EXISTS timescaledb;` before creating hypertables.

## `price_series` (OHLCV)
Primary historical price feed.
```sql
CREATE TABLE price_series (
  security_id   bigint NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  ts            timestamptz NOT NULL,
  interval      text NOT NULL CHECK (interval IN ('1m','5m','15m','1h','4h','1d','1w','1mo','1q')),
  open          numeric(18,8),
  high          numeric(18,8),
  low           numeric(18,8),
  close         numeric(18,8),
  volume        numeric(28,0),
  source_id     bigint NOT NULL REFERENCES providers(id),
  ingest_ts     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (security_id, ts, interval, source_id)
);

SELECT create_hypertable('price_series', by_range('ts'), if_not_exists => true);
-- Optional: space partition by security_id for very large universes:
-- SELECT create_hypertable('price_series','ts', 'security_id', 8, if_not_exists=>true);

CREATE INDEX ix_price_series_lookup
  ON price_series (security_id, ts DESC)
  INCLUDE (close, volume);

CREATE INDEX ix_price_series_interval
  ON price_series (interval);
```

### Compression & Retention
```sql
-- Migrations automatically apply compression and retention policies when
-- TimescaleDB is available. Adjust the policy windows here if applying
-- manually outside of the managed migrations.
SELECT add_compression_policy('price_series', INTERVAL '7 days');

SELECT add_retention_policy('price_series', INTERVAL '2 years',
  schedule_interval => INTERVAL '1 day');
```

## `fx_rates` (Spot FX)
Optional FX table for currency normalization.
```sql
CREATE TABLE fx_rates (
  base_ccy      text NOT NULL REFERENCES currencies(code),
  quote_ccy     text NOT NULL REFERENCES currencies(code),
  ts            timestamptz NOT NULL,
  rate          numeric(18,8) NOT NULL,
  source_id     bigint NOT NULL REFERENCES providers(id),
  ingest_ts     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (base_ccy, quote_ccy, ts, source_id)
);

SELECT create_hypertable('fx_rates', by_range('ts'), if_not_exists => true);

CREATE INDEX ix_fx_pairs ON fx_rates (base_ccy, quote_ccy, ts DESC);
```

## `econ_catalog` & `econ_series` (Macro)
FRED/ECB/other macro time series.
```sql
CREATE TABLE econ_catalog (
  id            bigserial PRIMARY KEY,
  provider_id   bigint NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  provider_key  text NOT NULL,                 -- e.g., FRED series id
  name          text NOT NULL,
  frequency     text CHECK (frequency IN ('daily','weekly','monthly','quarterly','annual')),
  unit          text,                          -- e.g., "index 2015=100", "percent"
  UNIQUE (provider_id, provider_key)
);

CREATE TABLE econ_series (
  series_id     bigint NOT NULL REFERENCES econ_catalog(id) ON DELETE CASCADE,
  ts            timestamptz NOT NULL,
  value         numeric(20,8),
  ingest_ts     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (series_id, ts)
);

SELECT create_hypertable('econ_series', by_range('ts'), if_not_exists => true);
CREATE INDEX ix_econ_series_lookup ON econ_series (series_id, ts DESC);
```

# Ingestion Metadata & Idempotency
## `ingest_runs`
Track batch jobs for observability and replay.
```sql
CREATE TABLE ingest_runs (
  id            bigserial PRIMARY KEY,
  provider_id   bigint NOT NULL REFERENCES providers(id),
  job_kind      text NOT NULL CHECK (job_kind IN ('prices','fx','econ')),
  symbol_hint   text,                              -- optional symbol/pair/series key
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  status        text NOT NULL CHECK (status IN ('running','success','error')),
  rows_written  bigint DEFAULT 0,
  error_message text
);

CREATE INDEX ix_ingest_runs_recent ON ingest_runs (started_at DESC);
```
To ensure idempotent upserts in price_series, use `INSERT ... ON CONFLICT DO UPDATE` on the composite PK `(security_id, ts, interval, source_id)`.

# Access Control (minimal)
```sql
-- Roles
CREATE ROLE collector NOLOGIN;
CREATE ROLE analyst   NOLOGIN;

-- Privileges
GRANT USAGE ON SCHEMA public TO collector, analyst;

GRANT SELECT, INSERT ON price_series TO collector;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analyst;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO analyst;
```

---

# Example Queries
Fetch daily OHLCV for a symbol and date range
```sql
SELECT s.symbol,
       ps.ts,
       ps.open,
       ps.high,
       ps.low,
       ps.close,
       ps.volume
FROM price_series ps
JOIN securities s ON s.id = ps.security_id
WHERE s.symbol = 'AAPL'
  AND ps.interval = '1d'
  AND ps.ts >= '2024-01-01'::date
  AND ps.ts <  '2025-01-01'::date
ORDER BY ps.ts;
```

Latest close across watchlist
```sql
SELECT DISTINCT ON (ps.security_id)
  s.symbol,
  ps.ts,
  ps.close
FROM price_series ps
JOIN securities s ON s.id = ps.security_id
WHERE s.symbol = ANY(ARRAY['AAPL','MSFT','NVDA'])
  AND ps.interval = '1d'
ORDER BY ps.security_id, ps.ts DESC;
```

Compute 20-day SMA from daily prices
```sql
SELECT
  ps.security_id,
  ps.ts,
  AVG(ps.close) OVER (
    PARTITION BY ps.security_id
    ORDER BY ps.ts
    ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
  ) AS sma20
FROM price_series ps
WHERE ps.security_id = (SELECT id FROM securities WHERE symbol='AAPL')
  AND ps.interval = '1d'
ORDER BY ps.ts;
```

Normalize prices to base currency via FX
```sql
WITH px AS (
  SELECT ps.ts, ps.close
  FROM price_series ps
  WHERE ps.security_id = (SELECT id FROM securities WHERE symbol='SAP') -- EUR
    AND ps.interval = '1d'
),
fx AS (
  SELECT date_trunc('day', ts) AS ts,
         last(rate, ts) AS eur_usd
  FROM fx_rates
  WHERE base_ccy = 'EUR' AND quote_ccy = 'USD'
  GROUP BY 1
)
SELECT date_trunc('day', px.ts) AS ts,
       px.close * fx.eur_usd AS close_usd
FROM px
JOIN fx ON date_trunc('day', px.ts) = fx.ts
ORDER BY ts;
```

Upsert example for ingestion
```
INSERT INTO price_series
(security_id, ts, interval, open, high, low, close, volume, source_id, ingest_ts)
VALUES
  ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
ON CONFLICT (security_id, ts, interval, source_id)
DO UPDATE SET
  open   = EXCLUDED.open,
  high   = EXCLUDED.high,
  low    = EXCLUDED.low,
  close  = EXCLUDED.close,
  volume = EXCLUDED.volume,
  ingest_ts = now();
```

# Maintenance & Policies
## Vacuum/Analyze
- Enable autovacuum; monitor pg_stat_user_tables.
- Analyze after large batch loads for planner accuracy.
## Compression
- Use segment-by security_id, interval, source_id; order-by timescale default (by time).
- Compress older-than policy tuned per interval and data volume.
## Retention
- Consider shorter retention for intraday, longer for daily/weekly.
- Keep corporate actions indefinitely; they are small but crucial.
## Backups
- Base backups + WAL archiving or pg_dump nightly; verify restores.
- Version schema with migration tool (e.g., sqitch, dbmate, node-pg-migrate).

# Seed & Test Data
Create a minimal seed for local dev:
```sql
INSERT INTO exchanges (code, name, country, timezone) VALUES
('NASDAQ','NASDAQ','US','America/New_York');

INSERT INTO currencies (code, name, decimals) VALUES
('USD','US Dollar',2), ('EUR','Euro',2);

INSERT INTO providers (code, name, base_url) VALUES
('alpha_vantage','Alpha Vantage','https://www.alphavantage.co');

INSERT INTO securities (symbol, name, exchange_id, currency_code, type)
VALUES ('AAPL','Apple Inc.',
        (SELECT id FROM exchanges WHERE code='NASDAQ'),
        'USD','equity');
```

# Notes & Extensions
- Add `instrument_aliases` if multiple canonical naming systems are required.
- Introduce `prices_adjusted` hypertable if you want to store adjusted OHLCV separately.
- For real-time tails, consider a Kafka/Redpanda topic and a narrow `recent_ticks` hypertable.
- For permissions-by-project, add RLS (Row Level Security) with watchlist predicates.
