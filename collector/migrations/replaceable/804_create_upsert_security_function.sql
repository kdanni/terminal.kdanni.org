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
    -- Try to find an existing record
    SELECT id
    INTO v_id
    FROM securities
    WHERE exchange_id = p_exchange_id
      AND symbol = p_symbol;

    IF v_id IS NULL THEN
        -- Record not found: insert new one
        INSERT INTO securities (exchange_id, symbol, name, currency_code, type)
        VALUES (p_exchange_id, p_symbol, p_name, p_currency_code, p_type)
        RETURNING id INTO v_id;
    ELSE
        -- Record exists: update it
        UPDATE securities
        SET name = p_name,
            currency_code = p_currency_code,
            type = p_type
        WHERE id = v_id
        RETURNING id INTO v_id;
    END IF;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;
