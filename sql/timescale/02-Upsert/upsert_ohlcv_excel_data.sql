CREATE OR REPLACE PROCEDURE upsert_ohlcv_excel_data(
    p_symbol     VARCHAR,
    p_time       TIMESTAMPTZ,
    p_open       NUMERIC,
    p_high       NUMERIC,
    p_low        NUMERIC,
    p_close      NUMERIC,
    p_volume     BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO ohlcv_excel_data (
        symbol, time,
        open, high, low, close, volume
    ) VALUES (
        p_symbol, p_time,
        p_open, p_high, p_low, p_close, p_volume
    )
    ON CONFLICT (symbol, time)
    DO UPDATE SET
        open     = EXCLUDED.open,
        high     = EXCLUDED.high,
        low      = EXCLUDED.low,
        close    = EXCLUDED.close,
        volume   = EXCLUDED.volume;
END;
$$;
