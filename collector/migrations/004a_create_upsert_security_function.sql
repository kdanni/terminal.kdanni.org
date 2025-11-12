CREATE OR REPLACE FUNCTION upsert_security(
  p_exchange_id BIGINT,
  p_symbol TEXT,
  p_name TEXT,
  p_currency_code TEXT,
  p_type TEXT DEFAULT 'equity'
) RETURNS BIGINT AS
$$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO securities (exchange_id, symbol, name, currency_code, type)
  VALUES (p_exchange_id, p_symbol, p_name, p_currency_code, p_type)
  ON CONFLICT ON CONSTRAINT uq_securities_exchange_symbol DO UPDATE
    SET name = EXCLUDED.name,
        currency_code = EXCLUDED.currency_code,
        type = EXCLUDED.type
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;
