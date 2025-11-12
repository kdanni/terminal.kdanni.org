CREATE INDEX IF NOT EXISTS ix_price_series_lookup
  ON price_series (security_id, ts DESC)
  INCLUDE (close, volume);
