CREATE OR REPLACE FUNCTION upsert_price_series(
  p_security_id BIGINT,
  p_ts TIMESTAMPTZ,
  p_interval TEXT,
  p_open NUMERIC,
  p_high NUMERIC,
  p_low NUMERIC,
  p_close NUMERIC,
  p_volume NUMERIC,
  p_source_id BIGINT
) RETURNS INTEGER AS
$$
DECLARE
  v_result INTEGER;
BEGIN
  INSERT INTO price_series (security_id, ts, interval, open, high, low, close, volume, source_id)
  VALUES (p_security_id, p_ts, p_interval, p_open, p_high, p_low, p_close, p_volume, p_source_id)
  ON CONFLICT (security_id, ts, interval, source_id) DO UPDATE
    SET open = EXCLUDED.open,
        high = EXCLUDED.high,
        low = EXCLUDED.low,
        close = EXCLUDED.close,
        volume = EXCLUDED.volume,
        ingest_ts = NOW()
  RETURNING 1 INTO v_result;

  RETURN COALESCE(v_result, 0);
END;
$$ LANGUAGE plpgsql;
