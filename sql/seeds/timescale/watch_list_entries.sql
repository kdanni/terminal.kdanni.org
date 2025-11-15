WITH upsert AS (
    INSERT INTO asset_watch_list (
        symbol,
        exchange,
        active
    ) VALUES
        ('AAPL', 'NASDAQ', TRUE),
        ('MSFT', 'NASDAQ', TRUE),
        ('GOOGL', 'NASDAQ', TRUE),
        ('AMZN', 'NASDAQ', TRUE),
        ('NVDA', 'NASDAQ', TRUE),
        ('META', 'NASDAQ', TRUE),
        ('TSLA', 'NASDAQ', TRUE)
    ON CONFLICT ON CONSTRAINT asset_watch_list_symbol_exchange_idx DO UPDATE
    SET
        active = EXCLUDED.active,
        updated_at = NOW()
    RETURNING id
)
INSERT INTO asset_watch_history (
    watch_list_id,
    active_from
)
SELECT
    u.id,
    NOW()
FROM upsert u
LEFT JOIN asset_watch_history awh
    ON awh.watch_list_id = u.id
   AND awh.inactive_at IS NULL
WHERE awh.id IS NULL;
