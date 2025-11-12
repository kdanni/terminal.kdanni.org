CREATE OR REPLACE FUNCTION upsert_fx_rate(
  p_base_ccy TEXT,
  p_quote_ccy TEXT,
  p_ts TIMESTAMPTZ,
  p_rate NUMERIC,
  p_source_id BIGINT
) RETURNS INTEGER AS
$$
DECLARE
  v_result INTEGER;
BEGIN
  INSERT INTO fx_rates (base_ccy, quote_ccy, ts, rate, source_id)
  VALUES (p_base_ccy, p_quote_ccy, p_ts, p_rate, p_source_id)
  ON CONFLICT (base_ccy, quote_ccy, ts, source_id) DO UPDATE
    SET rate = EXCLUDED.rate,
        ingest_ts = NOW()
  RETURNING 1 INTO v_result;

  RETURN COALESCE(v_result, 0);
END;
$$ LANGUAGE plpgsql;
