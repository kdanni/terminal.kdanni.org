-- Price series hypertable and supporting policies.
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

CREATE INDEX IF NOT EXISTS ix_price_series_lookup
  ON price_series (security_id, ts DESC)
  INCLUDE (close, volume);

CREATE INDEX IF NOT EXISTS ix_price_series_interval
  ON price_series (interval);

DO
$$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    PERFORM create_hypertable('price_series', by_range('ts'), if_not_exists => TRUE);

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
      PERFORM add_compression_policy('price_series', INTERVAL '7 days');
      PERFORM add_retention_policy('price_series', INTERVAL '2 years', schedule_interval => INTERVAL '1 day');
    ELSE
      RAISE NOTICE 'timescaledb_columnar extension not installed; price_series will remain row-store.';
    END IF;

  ELSE
    RAISE NOTICE 'TimescaleDB not installed; price_series hypertable was not created.';
  END IF;
END;
$$;
