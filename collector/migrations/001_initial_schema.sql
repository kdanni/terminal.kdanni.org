-- 001_initial_schema.sql
-- Baseline schema for the collector database aligned with SCHEMA.md.

-- Reference tables
CREATE TABLE IF NOT EXISTS exchanges (
  id            BIGSERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  country       TEXT NOT NULL,
  timezone      TEXT NOT NULL,
  mic           TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS currencies (
  code          TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  decimals      SMALLINT NOT NULL CHECK (decimals BETWEEN 0 AND 8)
);

CREATE TABLE IF NOT EXISTS providers (
  id            BIGSERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  base_url      TEXT NOT NULL
);

-- Domain tables
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

CREATE INDEX IF NOT EXISTS ix_symbols_security
  ON symbols (security_id);

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

-- Time-series tables
CREATE TABLE IF NOT EXISTS price_series (
  security_id   BIGINT NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  ts            TIMESTAMPTZ NOT NULL,
  interval      TEXT NOT NULL CHECK (interval IN ('1m','5m','15m','1h','4h','1d','1w','1mo','1q')),
  open          NUMERIC(18,8),
  high          NUMERIC(18,8),
  low           NUMERIC(18,8),
  close         NUMERIC(18,8),
  volume        NUMERIC(28,0),
  source_id     BIGINT NOT NULL REFERENCES providers(id),
  ingest_ts     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (security_id, ts, interval, source_id)
);

CREATE TABLE IF NOT EXISTS fx_rates (
  base_ccy      TEXT NOT NULL REFERENCES currencies(code),
  quote_ccy     TEXT NOT NULL REFERENCES currencies(code),
  ts            TIMESTAMPTZ NOT NULL,
  rate          NUMERIC(18,8) NOT NULL,
  source_id     BIGINT NOT NULL REFERENCES providers(id),
  ingest_ts     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (base_ccy, quote_ccy, ts, source_id)
);

CREATE TABLE IF NOT EXISTS econ_catalog (
  id            BIGSERIAL PRIMARY KEY,
  provider_id   BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  provider_key  TEXT NOT NULL,
  name          TEXT NOT NULL,
  frequency     TEXT CHECK (frequency IN ('daily','weekly','monthly','quarterly','annual')),
  unit          TEXT,
  UNIQUE (provider_id, provider_key)
);

CREATE TABLE IF NOT EXISTS econ_series (
  series_id     BIGINT NOT NULL REFERENCES econ_catalog(id) ON DELETE CASCADE,
  ts            TIMESTAMPTZ NOT NULL,
  value         NUMERIC(20,8),
  ingest_ts     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (series_id, ts)
);

-- Ingestion metadata
CREATE TABLE IF NOT EXISTS ingest_runs (
  id            BIGSERIAL PRIMARY KEY,
  provider_id   BIGINT NOT NULL REFERENCES providers(id),
  job_kind      TEXT NOT NULL CHECK (job_kind IN ('prices','fx','econ')),
  symbol_hint   TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at   TIMESTAMPTZ,
  status        TEXT NOT NULL CHECK (status IN ('running','success','error')),
  rows_written  BIGINT DEFAULT 0,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS ix_price_series_lookup
  ON price_series (security_id, ts DESC)
  INCLUDE (close, volume);

CREATE INDEX IF NOT EXISTS ix_price_series_interval
  ON price_series (interval);

CREATE INDEX IF NOT EXISTS ix_fx_pairs
  ON fx_rates (base_ccy, quote_ccy, ts DESC);

CREATE INDEX IF NOT EXISTS ix_econ_series_lookup
  ON econ_series (series_id, ts DESC);

CREATE INDEX IF NOT EXISTS ix_ingest_runs_recent
  ON ingest_runs (started_at DESC);

-- TimescaleDB integration (optional)
DO
$$
BEGIN
  BEGIN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS timescaledb';
  EXCEPTION
    WHEN undefined_file THEN
      RAISE NOTICE 'TimescaleDB extension is not available; continuing without it.';
  END;
END;
$$;

DO
$$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    -- Enable the columnar extension when available so we can use
    -- TimescaleDB's columnstore compression on the primary hypertable.
    BEGIN
      EXECUTE 'CREATE EXTENSION IF NOT EXISTS timescaledb_columnar';
    EXCEPTION
      WHEN undefined_file THEN
        RAISE NOTICE 'timescaledb_columnar extension is not available; continuing without it.';
      WHEN others THEN
        RAISE NOTICE 'timescaledb_columnar extension could not be installed: %', SQLERRM;
    END;

    PERFORM create_hypertable('price_series', by_range('ts'), if_not_exists => TRUE);
    PERFORM create_hypertable('fx_rates', by_range('ts'), if_not_exists => TRUE);
    PERFORM create_hypertable('econ_series', by_range('ts'), if_not_exists => TRUE);
  ELSE
    RAISE NOTICE 'TimescaleDB not installed; hypertables were not created.';
  END IF;
END;
$$;

DO
$$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    -- Try to enable columnar compression for price_series when the
    -- columnar extension is present. The notices make the migration
    -- resilient on older images that might not yet bundle the feature.
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb_columnar') THEN
      BEGIN
        EXECUTE $columnar$
          ALTER TABLE price_series
          SET (
            timescaledb.columnar = true,
            timescaledb.compress = true,
            timescaledb.compress_segmentby = 'security_id,interval,source_id',
            timescaledb.compress_orderby = 'ts DESC'
          )
        $columnar$;
      EXCEPTION
        WHEN undefined_object OR invalid_parameter_value THEN
          RAISE NOTICE 'Columnar compression settings could not be applied to price_series: %', SQLERRM;
      END;
    ELSE
      RAISE NOTICE 'timescaledb_columnar extension not installed; price_series will remain row-store.';
    END IF;

    EXECUTE $cagg$
      CREATE MATERIALIZED VIEW IF NOT EXISTS cagg_daily
      WITH (timescaledb.continuous) AS
      SELECT
        security_id,
        time_bucket('1 day', ts) AS bucket,
        first(open, ts)  AS open,
        max(high)        AS high,
        min(low)         AS low,
        last(close, ts)  AS close,
        sum(volume)      AS volume
      FROM price_series
      WHERE interval IN ('1m','5m','15m','1h')
      GROUP BY security_id, bucket
      WITH NO DATA
    $cagg$;

    PERFORM add_continuous_aggregate_policy(
      'cagg_daily',
      start_offset => INTERVAL '30 days',
      end_offset   => INTERVAL '1 hour',
      schedule_interval => INTERVAL '15 minutes'
    );

    PERFORM add_compression_policy('price_series', INTERVAL '7 days');
    PERFORM add_retention_policy('price_series', INTERVAL '2 years', schedule_interval => INTERVAL '1 day');

  ELSE
    RAISE NOTICE 'TimescaleDB not installed; skipping continuous aggregates and policies.';
    EXECUTE $cagg_simple$
      CREATE MATERIALIZED VIEW IF NOT EXISTS cagg_daily AS
      SELECT
        security_id,
        date_trunc('day', ts) AS bucket,
        (array_agg(open  ORDER BY ts ASC))[1] AS open,
        max(high)   AS high,
        min(low)    AS low,
        (array_agg(close ORDER BY ts DESC))[1] AS close,
        sum(volume) AS volume
      FROM price_series
      WHERE interval IN ('1m','5m','15m','1h')
      GROUP BY security_id, date_trunc('day', ts)
      WITH NO DATA
    $cagg_simple$;
  END IF;
END;
$$;

-- NOTE: Materialized views are created WITH NO DATA so this migration can run inside
-- the surrounding transaction. Execute REFRESH MATERIALIZED VIEW commands separately
-- after the migration if you need to backfill data immediately.

CREATE OR REPLACE VIEW v_last_close AS
SELECT DISTINCT ON (ps.security_id)
  ps.security_id,
  ps.ts,
  ps.close,
  ps.volume,
  ps.interval,
  ps.source_id
FROM price_series ps
WHERE ps.interval = '1d'
ORDER BY ps.security_id, ps.ts DESC;

CREATE MATERIALIZED VIEW IF NOT EXISTS v_adjusted_daily AS
WITH daily AS (
  SELECT security_id, bucket AS ts, open, high, low, close, volume
  FROM cagg_daily
),
raw_actions AS (
  SELECT
    ca.security_id,
    (ca.action_date)::timestamptz AS ts,
    CASE
      WHEN ca.kind = 'split' AND ca.factor_num IS NOT NULL AND ca.factor_den IS NOT NULL
        THEN (ca.factor_den / ca.factor_num)
      ELSE 1.0
    END AS split_factor
  FROM corporate_actions ca
),
ordered AS (
  SELECT
    d.security_id,
    d.ts,
    d.open,
    d.high,
    d.low,
    d.close,
    d.volume,
    COALESCE(EXP(SUM(LN(raw_actions.split_factor)) OVER (
      PARTITION BY d.security_id
      ORDER BY d.ts
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    )), 1.0) AS adj_factor
  FROM daily d
  LEFT JOIN raw_actions
    ON raw_actions.security_id = d.security_id
   AND raw_actions.ts <= d.ts
)
SELECT
  security_id,
  ts,
  open  * adj_factor AS open_adj,
  high  * adj_factor AS high_adj,
  low   * adj_factor AS low_adj,
  close * adj_factor AS close_adj,
  CASE
    WHEN adj_factor = 0 THEN NULL
    ELSE volume / adj_factor
  END AS volume_adj
FROM ordered;

-- Access control (best-effort; role creation is idempotent)
DO
$$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'collector') THEN
    CREATE ROLE collector NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'analyst') THEN
    CREATE ROLE analyst NOLOGIN;
  END IF;
END;
$$;

GRANT USAGE ON SCHEMA public TO collector, analyst;
GRANT SELECT, INSERT ON price_series TO collector;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analyst;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO analyst;
