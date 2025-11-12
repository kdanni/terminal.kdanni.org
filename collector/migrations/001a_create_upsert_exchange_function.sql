CREATE OR REPLACE FUNCTION upsert_exchange(
  p_code TEXT,
  p_name TEXT,
  p_country TEXT,
  p_timezone TEXT,
  p_mic TEXT
) RETURNS BIGINT AS
$$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO exchanges (code, name, country, timezone, mic)
  VALUES (p_code, p_name, p_country, p_timezone, p_mic)
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        country = EXCLUDED.country,
        timezone = EXCLUDED.timezone,
        mic = EXCLUDED.mic
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;
