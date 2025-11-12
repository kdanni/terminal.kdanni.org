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
