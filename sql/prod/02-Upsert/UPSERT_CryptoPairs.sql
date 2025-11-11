
-- UPSERT sp for inserting or updating cryptocurrency pairs
DROP PROCEDURE IF EXISTS upsert_cryptocurrency_pair;

CREATE PROCEDURE upsert_cryptocurrency_pair(
    IN p_symbol VARCHAR(16),
    IN p_available_exchanges JSON,
    IN p_currency_base VARCHAR(32),
    IN p_currency_quote VARCHAR(32)
)
BEGIN
    INSERT INTO cryptocurrency_pairs (
        symbol, available_exchanges, currency_base, currency_quote
    ) VALUES (
        p_symbol, p_available_exchanges, p_currency_base, p_currency_quote
    )
    ON DUPLICATE KEY UPDATE
        available_exchanges = VALUES(available_exchanges),
        currency_base = VALUES(currency_base),
        currency_quote = VALUES(currency_quote);
END;