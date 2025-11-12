CREATE INDEX IF NOT EXISTS ix_fx_pairs
  ON fx_rates (base_ccy, quote_ccy, ts DESC);
