CREATE TABLE IF NOT EXISTS exchanges (
  id            BIGSERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  country       TEXT NOT NULL,
  timezone      TEXT NOT NULL,
  mic           TEXT UNIQUE
);
