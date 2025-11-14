DROP PROCEDURE IF EXISTS upsert_exchange;

CREATE PROCEDURE upsert_exchange(
    IN p_code VARCHAR(32),
    IN p_name VARCHAR(255),
    IN p_country VARCHAR(128),
    IN p_city VARCHAR(128),
    IN p_timezone VARCHAR(64),
    IN p_currency VARCHAR(16),
    IN p_mic_code VARCHAR(16),
    IN p_acronym VARCHAR(64),
    IN p_website VARCHAR(255),
    IN p_phone VARCHAR(64),
    IN p_address VARCHAR(255)
)
BEGIN
    INSERT INTO exchanges_catalog (
        code,
        name,
        country,
        city,
        timezone,
        currency,
        mic_code,
        acronym,
        website,
        phone,
        address
    ) VALUES (
        p_code,
        p_name,
        p_country,
        p_city,
        p_timezone,
        p_currency,
        p_mic_code,
        p_acronym,
        p_website,
        p_phone,
        p_address
    )
    ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        country = VALUES(country),
        city = VALUES(city),
        timezone = VALUES(timezone),
        currency = VALUES(currency),
        mic_code = VALUES(mic_code),
        acronym = VALUES(acronym),
        website = VALUES(website),
        phone = VALUES(phone),
        address = VALUES(address);
END;
