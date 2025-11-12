-- FX rates, economic series, and ingestion bookkeeping.
CREATE TABLE IF NOT EXISTS fx_rates (
  base_ccy      TEXT NOT NULL REFERENCES currencies(code),
  quote_ccy     TEXT NOT NULL REFERENCES currencies(code),
  ts            TIMESTAMPTZ NOT NULL,
  rate          NUMERIC(18,8) NOT NULL,
  source_id     BIGINT NOT NULL REFERENCES providers(id),
  ingest_ts     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (base_ccy, quote_ccy, ts, source_id)
);

CREATE INDEX IF NOT EXISTS ix_fx_rates_pairs
  ON fx_rates (base_ccy, quote_ccy);

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

CREATE INDEX IF NOT EXISTS ix_econ_series_lookup
  ON econ_series (series_id, ts DESC);

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

CREATE INDEX IF NOT EXISTS ix_ingest_runs_recent
  ON ingest_runs (started_at DESC);

DO
$$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    PERFORM create_hypertable('fx_rates', by_range('ts'), if_not_exists => TRUE);
    PERFORM create_hypertable('econ_series', by_range('ts'), if_not_exists => TRUE);
  ELSE
    RAISE NOTICE 'TimescaleDB not installed; fx_rates/econ_series hypertables were not created.';
  END IF;
END;
$$;
