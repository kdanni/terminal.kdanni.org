CREATE TABLE IF NOT EXISTS currencies (
  code          TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  decimals      SMALLINT NOT NULL CHECK (decimals BETWEEN 0 AND 8)
);
