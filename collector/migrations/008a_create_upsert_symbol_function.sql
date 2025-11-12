CREATE OR REPLACE FUNCTION upsert_symbol(
  p_security_id BIGINT,
  p_provider_id BIGINT,
  p_provider_sym TEXT
) RETURNS VOID AS
$$
BEGIN
  INSERT INTO symbols (security_id, provider_id, provider_sym)
  VALUES (p_security_id, p_provider_id, p_provider_sym)
  ON CONFLICT (provider_id, provider_sym) DO UPDATE
    SET security_id = EXCLUDED.security_id;
END;
$$ LANGUAGE plpgsql;
