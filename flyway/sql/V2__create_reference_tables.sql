-- Core reference tables for exchanges, currencies, and data providers.
CREATE TABLE IF NOT EXISTS exchanges (
  id            BIGSERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  country       TEXT NOT NULL,
  timezone      TEXT NOT NULL,
  mic           TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS currencies (
  code          TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  decimals      SMALLINT NOT NULL CHECK (decimals BETWEEN 0 AND 8)
);

CREATE TABLE IF NOT EXISTS providers (
  id            BIGSERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  base_url      TEXT NOT NULL
);
