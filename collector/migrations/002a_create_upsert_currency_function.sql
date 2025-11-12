CREATE OR REPLACE FUNCTION upsert_currency(
  p_code TEXT,
  p_name TEXT,
  p_decimals SMALLINT
) RETURNS VOID AS
$$
BEGIN
  INSERT INTO currencies (code, name, decimals)
  VALUES (p_code, p_name, p_decimals)
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        decimals = EXCLUDED.decimals;
END;
$$ LANGUAGE plpgsql;
