INSERT INTO stocks_list (
    symbol,
    name,
    currency,
    exchange,
    mic_code,
    country,
    type,
    figi_code,
    cfi_code,
    isin,
    cusip,
    access_global,
    access_plan
) VALUES
    ('AAPL', 'Apple Inc.', 'USD', 'NASDAQ', 'XNGS', 'United States', 'Common Stock', 'BBG000B9Y5X2', 'ESVUFR', 'US0378331005', '037833100', 'Level A', 'Grow'),
    ('MSFT', 'Microsoft Corporation', 'USD', 'NASDAQ', 'XNGS', 'United States', 'Common Stock', 'BBG000BPH459', 'ESVUFR', 'US5949181045', '594918104', 'Level A', 'Grow')
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    currency = VALUES(currency),
    exchange = VALUES(exchange),
    mic_code = VALUES(mic_code),
    country = VALUES(country),
    type = VALUES(type),
    figi_code = VALUES(figi_code),
    cfi_code = VALUES(cfi_code),
    isin = VALUES(isin),
    cusip = VALUES(cusip),
    access_global = VALUES(access_global),
    access_plan = VALUES(access_plan),
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO forex_pairs_list (
    symbol,
    currency_group,
    currency_base,
    currency_quote
) VALUES
    ('EUR/USD', 'Major', 'EUR', 'USD'),
    ('USD/JPY', 'Major', 'USD', 'JPY')
ON DUPLICATE KEY UPDATE
    symbol = VALUES(symbol),
    currency_group = VALUES(currency_group),
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO cryptocurrency_pairs (
    symbol,
    available_exchanges,
    currency_base,
    currency_quote
) VALUES
    ('BTC/USD', JSON_ARRAY('Coinbase', 'Kraken'), 'Bitcoin', 'US Dollar'),
    ('ETH/USD', JSON_ARRAY('Coinbase', 'Kraken'), 'Ethereum', 'US Dollar')
ON DUPLICATE KEY UPDATE
    available_exchanges = VALUES(available_exchanges),
    currency_base = VALUES(currency_base),
    currency_quote = VALUES(currency_quote),
    updated_at = CURRENT_TIMESTAMP;
