CREATE UNIQUE INDEX IF NOT EXISTS uq_securities_exchange_symbol
  ON securities (exchange_id, symbol)
  WHERE exchange_id IS NOT NULL;
