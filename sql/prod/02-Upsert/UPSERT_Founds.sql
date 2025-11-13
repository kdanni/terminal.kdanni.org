-- UPSERT sp for inserting or updating

DROP PROCEDURE IF EXISTS upsert_fund;

CREATE PROCEDURE upsert_fund (
    IN p_symbol VARCHAR(10),
    IN p_name VARCHAR(512),
    IN p_country VARCHAR(50),
    IN p_currency VARCHAR(10),
    IN p_exchange VARCHAR(50),
    IN p_mic_code VARCHAR(10),
    IN p_type VARCHAR(50),
    IN p_figi_code VARCHAR(12),
    IN p_cfi_code VARCHAR(6),
    IN p_isin VARCHAR(255),
    IN p_cusip VARCHAR(255),
    IN p_access_global VARCHAR(20),
    IN p_access_plan VARCHAR(20)
)
BEGIN
    INSERT INTO funds (
        symbol, name, country, currency, exchange,
        mic_code, type, figi_code, cfi_code, isin,
        cusip, access_global, access_plan
    ) VALUES (
        p_symbol, p_name, p_country, p_currency, p_exchange,
        p_mic_code, p_type, p_figi_code, p_cfi_code, p_isin,
        p_cusip, p_access_global, p_access_plan
    )
    ON DUPLICATE KEY UPDATE
        name = p_name,
        country = p_country,
        currency = p_currency,
        exchange = p_exchange,
        mic_code = p_mic_code,
        type = p_type,
        figi_code = p_figi_code,
        cfi_code = p_cfi_code,
        isin = p_isin,
        cusip = p_cusip,
        access_global = p_access_global,
        access_plan = p_access_plan,
        updated_at = CURRENT_TIMESTAMP;
END;