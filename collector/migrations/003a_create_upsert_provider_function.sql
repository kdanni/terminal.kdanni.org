CREATE OR REPLACE FUNCTION upsert_provider(
  p_code TEXT,
  p_name TEXT,
  p_base_url TEXT
) RETURNS BIGINT AS
$$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO providers (code, name, base_url)
  VALUES (p_code, p_name, p_base_url)
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        base_url = EXCLUDED.base_url
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;
