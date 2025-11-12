CREATE TABLE IF NOT EXISTS symbols (
  id            BIGSERIAL PRIMARY KEY,
  security_id   BIGINT NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  provider_id   BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  provider_sym  TEXT NOT NULL,
  UNIQUE (provider_id, provider_sym)
);
