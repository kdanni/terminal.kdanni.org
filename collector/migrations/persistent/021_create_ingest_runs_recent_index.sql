CREATE INDEX IF NOT EXISTS ix_ingest_runs_recent
  ON ingest_runs (started_at DESC);
