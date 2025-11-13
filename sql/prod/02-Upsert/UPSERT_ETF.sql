-- UPSERT sp for inserting or updating
DROP PROCEDURE IF EXISTS upsert_etf;

CREATE PROCEDURE upsert_etf(
    IN p_symbol VARCHAR(10),
    IN p_name VARCHAR(512),
    IN p_currency VARCHAR(10),
    IN p_exchange VARCHAR(50),
    IN p_mic_code VARCHAR(10),
    IN p_country VARCHAR(50),
    IN p_figi_code VARCHAR(12),
    IN p_cfi_code VARCHAR(6),
    IN p_isin VARCHAR(255),
    IN p_cusip VARCHAR(255),
    IN p_access_global VARCHAR(20),
    IN p_access_plan VARCHAR(20)
)
BEGIN
    INSERT INTO etf (
        symbol, name, currency, exchange, mic_code, country,
        figi_code, cfi_code, isin, cusip, access_global, access_plan
    ) VALUES (
        p_symbol, p_name, p_currency, p_exchange, p_mic_code, p_country,
        p_figi_code, p_cfi_code, p_isin, p_cusip, p_access_global, p_access_plan
    )
    ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        currency = VALUES(currency),
        exchange = VALUES(exchange),
        mic_code = VALUES(mic_code),
        country = VALUES(country),
        figi_code = VALUES(figi_code),
        cfi_code = VALUES(cfi_code),
        isin = VALUES(isin),
        cusip = VALUES(cusip),
        access_global = VALUES(access_global),
        access_plan = VALUES(access_plan);
END;
