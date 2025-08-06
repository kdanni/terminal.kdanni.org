DROP PROCEDURE IF EXISTS upsert_forex_pairs_list;

-- UPSERT sp for inserting or updating forex pairs metadata
CREATE PROCEDURE upsert_forex_pairs_list(
    IN p_symbol          VARCHAR(16),
    IN p_currency_group  VARCHAR(32),
    IN p_currency_base   VARCHAR(8),
    IN p_currency_quote  VARCHAR(8)
)
BEGIN
    INSERT INTO forex_pairs_list (symbol, currency_group, currency_base, currency_quote)
    VALUES (p_symbol, p_currency_group, p_currency_base, p_currency_quote)
    ON DUPLICATE KEY UPDATE
        currency_group = p_currency_group,
        symbol = p_symbol;
END;