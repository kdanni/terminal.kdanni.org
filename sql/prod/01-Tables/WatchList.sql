-- Watch list entries synchronized with the time-series database
-- This table supports the asset catalog UI and user watch list management.
-- NOTE: exchange values use an empty string to represent a global/non-exchange scoped symbol
-- to keep the schema compatible with the time-series database where NULL indicates the same state.
CREATE TABLE IF NOT EXISTS watch_list (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    symbol VARCHAR(64) NOT NULL,
    exchange VARCHAR(64) NOT NULL DEFAULT '',
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uniq_watch_list_symbol_exchange (symbol, exchange),
    INDEX idx_watch_list_active (active),
    INDEX idx_watch_list_symbol (symbol),
    INDEX idx_watch_list_exchange (exchange)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
