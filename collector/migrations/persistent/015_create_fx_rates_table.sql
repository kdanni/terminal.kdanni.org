CREATE TABLE IF NOT EXISTS fx_rates (
  base_ccy      TEXT NOT NULL REFERENCES currencies(code),
  quote_ccy     TEXT NOT NULL REFERENCES currencies(code),
  ts            TIMESTAMPTZ NOT NULL,
  rate          NUMERIC(18,8) NOT NULL,
  source_id     BIGINT NOT NULL REFERENCES providers(id),
  ingest_ts     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (base_ccy, quote_ccy, ts, source_id)
);
