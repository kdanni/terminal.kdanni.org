CREATE TABLE IF NOT EXISTS providers (
  id            BIGSERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  base_url      TEXT NOT NULL
);
