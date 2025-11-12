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
