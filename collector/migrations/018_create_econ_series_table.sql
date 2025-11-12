CREATE TABLE IF NOT EXISTS econ_series (
  series_id     BIGINT NOT NULL REFERENCES econ_catalog(id) ON DELETE CASCADE,
  ts            TIMESTAMPTZ NOT NULL,
  value         NUMERIC(20,8),
  ingest_ts     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (series_id, ts)
);
