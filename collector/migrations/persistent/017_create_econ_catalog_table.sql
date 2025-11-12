CREATE TABLE IF NOT EXISTS econ_catalog (
  id            BIGSERIAL PRIMARY KEY,
  provider_id   BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  provider_key  TEXT NOT NULL,
  name          TEXT NOT NULL,
  frequency     TEXT CHECK (frequency IN ('daily','weekly','monthly','quarterly','annual')),
  unit          TEXT,
  UNIQUE (provider_id, provider_key)
);
