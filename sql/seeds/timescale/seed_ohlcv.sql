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
) VALUES
    ('AAPL', 'NASDAQ', '1d', '2024-01-02T00:00:00Z', 185.25, 186.20, 184.90, 185.64, 51234567),
    ('AAPL', 'NASDAQ', '1d', '2024-01-03T00:00:00Z', 185.80, 187.10, 185.10, 186.50, 49876543),
    ('MSFT', 'NASDAQ', '1d', '2024-01-02T00:00:00Z', 315.20, 318.00, 314.75, 317.45, 40321987)
ON CONFLICT (symbol, interval, time) DO UPDATE SET
    exchange = EXCLUDED.exchange,
    open = EXCLUDED.open,
    high = EXCLUDED.high,
    low = EXCLUDED.low,
    close = EXCLUDED.close,
    volume = EXCLUDED.volume;
