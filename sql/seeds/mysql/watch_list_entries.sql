INSERT INTO watch_list (
    symbol,
    exchange,
    active
) VALUES
    ('AAPL', 'NASDAQ', 1),
    ('MSFT', 'NASDAQ', 1),
    ('GOOGL', 'NASDAQ', 1),
    ('AMZN', 'NASDAQ', 1),
    ('NVDA', 'NASDAQ', 1),
    ('META', 'NASDAQ', 1),
    ('TSLA', 'NASDAQ', 1)
ON DUPLICATE KEY UPDATE
    active = VALUES(active),
    updated_at = CURRENT_TIMESTAMP;
