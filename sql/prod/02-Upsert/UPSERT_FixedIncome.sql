
-- UPSERT sp for inserting or updating

DROP PROCEDURE IF EXISTS upsert_fixed_income;

CREATE PROCEDURE upsert_fixed_income(
    IN p_symbol VARCHAR(16),
    IN p_name VARCHAR(512),
    IN p_country VARCHAR(100),
    IN p_currency VARCHAR(10),
    IN p_exchange VARCHAR(50),
    IN p_mic_code VARCHAR(10),
    IN p_type VARCHAR(50),
    IN p_access_global VARCHAR(20),
    IN p_access_plan VARCHAR(20)
)
BEGIN
    INSERT INTO fixed_income (
        symbol, name, country, currency, exchange, mic_code,
        type, access_global, access_plan
    ) VALUES (
        p_symbol, p_name, p_country, p_currency, p_exchange, p_mic_code,
        p_type, p_access_global, p_access_plan
    )
    ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        country = VALUES(country),
        currency = VALUES(currency),
        exchange = VALUES(exchange),
        mic_code = VALUES(mic_code),
        type = VALUES(type),
        access_global = VALUES(access_global),
        access_plan = VALUES(access_plan);
END;
