-- Insert or update data from the Excel staging table into the canonical OHLCV table.
-- The Excel symbol format is "<exchange>:<ticker>". This procedure splits the
-- symbol into exchange and ticker, assigns a fixed 1d interval, and normalizes
-- timestamps into UTC using the provided source time zone.
CREATE OR REPLACE PROCEDURE upsert_ohlcv_data_from_excel(
    p_source_time_zone TEXT DEFAULT 'UTC'
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO ohlcv_data (
        symbol,
        exchange,
        interval,
        time,
        open,
        high,
        low,
        close,
        volume
    )
    SELECT
        CASE
            WHEN strpos(src.symbol, ':') > 0 THEN split_part(src.symbol, ':', 2)
            ELSE src.symbol
        END AS symbol,
        CASE
            WHEN strpos(src.symbol, ':') > 0 THEN NULLIF(split_part(src.symbol, ':', 1), '')
            ELSE NULL
        END AS exchange,
        '1d' AS interval,
        (
            src.time AT TIME ZONE COALESCE(NULLIF(p_source_time_zone, ''), 'UTC')
        ) AT TIME ZONE 'UTC' AS normalized_time,
        src.open,
        src.high,
        src.low,
        src.close,
        src.volume
    FROM ohlcv_excel_data src
    ON CONFLICT (symbol, interval, time)
    DO UPDATE SET
        exchange = COALESCE(EXCLUDED.exchange, ohlcv_data.exchange),
        open     = EXCLUDED.open,
        high     = EXCLUDED.high,
        low      = EXCLUDED.low,
        close    = EXCLUDED.close,
        volume   = EXCLUDED.volume;
END;
$$;
