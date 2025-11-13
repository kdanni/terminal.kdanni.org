DROP PROCEDURE IF EXISTS upsert_stock;

-- UPSERT sp for inserting or updating stock metadata
CREATE PROCEDURE upsert_stock(
    IN p_symbol VARCHAR(32),
    IN p_name VARCHAR(128),
    IN p_currency VARCHAR(8),
    IN p_exchange VARCHAR(32),
    IN p_mic_code VARCHAR(12),
    IN p_country VARCHAR(64),
    IN p_type VARCHAR(32),
    IN p_figi_code VARCHAR(12),
    IN p_cfi_code VARCHAR(6),
    IN p_isin VARCHAR(82),
    IN p_cusip VARCHAR(82),
    IN p_access_global VARCHAR(16),
    IN p_access_plan VARCHAR(16)
)
BEGIN

    -- Use the mysql specific update on conflict single statement
    INSERT INTO stocks_list (
        symbol, name, currency, exchange, mic_code, country,
        type, figi_code, cfi_code, isin, cusip,
        access_global, access_plan
    ) VALUES (
        p_symbol, p_name, p_currency, p_exchange, p_mic_code, p_country,
        p_type, p_figi_code, p_cfi_code, p_isin, p_cusip,
        p_access_global, p_access_plan
    )
    ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        currency = VALUES(currency),
        mic_code = VALUES(mic_code),
        country = VALUES(country),
        type = VALUES(type),
        figi_code = VALUES(figi_code),
        cfi_code = VALUES(cfi_code),
        isin = VALUES(isin),
        cusip = VALUES(cusip),
        access_global = VALUES(access_global),
        access_plan = VALUES(access_plan);
END;