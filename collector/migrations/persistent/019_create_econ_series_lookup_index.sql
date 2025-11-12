CREATE INDEX IF NOT EXISTS ix_econ_series_lookup
  ON econ_series (series_id, ts DESC);
