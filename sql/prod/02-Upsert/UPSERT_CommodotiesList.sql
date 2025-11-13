-- CREATE IF NOT EXISTS TABLE commodities (
--     symbol VARCHAR(10) PRIMARY KEY,
--     name VARCHAR(100) NOT NULL,
--     category VARCHAR(50) NOT NULL,
--     description TEXT,

-- UPSER SP for Commodities

DROP PROCEDURE IF EXISTS upsert_commodities;

CREATE PROCEDURE upsert_commodities(
    IN p_symbol VARCHAR(10),
    IN p_name VARCHAR(512),
    IN p_category VARCHAR(50),
    IN p_description TEXT
)
BEGIN
    INSERT INTO commodities (symbol, name, category, description)
    VALUES (p_symbol, p_name, p_category, p_description)
    ON DUPLICATE KEY UPDATE
        name = p_name,
        category = p_category,
        description = p_description;
END;
