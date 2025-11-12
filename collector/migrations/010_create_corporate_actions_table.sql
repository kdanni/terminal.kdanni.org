CREATE TABLE IF NOT EXISTS corporate_actions (
  id            BIGSERIAL PRIMARY KEY,
  security_id   BIGINT NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  action_date   DATE NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('split','dividend','symbol_change')),
  factor_num    NUMERIC(18,8),
  factor_den    NUMERIC(18,8),
  cash_amount   NUMERIC(18,8),
  currency_code TEXT REFERENCES currencies(code),
  note          TEXT
);
