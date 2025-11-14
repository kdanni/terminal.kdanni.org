-- Schema objects supporting exchange and asset ranking workflows.
-- These tables capture the inputs collected during ranking runs and the
-- resulting scores derived from the ranking engine.

CREATE TABLE IF NOT EXISTS ranking_runs (
    run_id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    ranking_type    ENUM('exchange', 'asset') NOT NULL,
    effective_at    DATETIME        NOT NULL,
    description     VARCHAR(255)    NULL,
    status          ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    metadata        JSON            NULL,
    parameters      JSON            NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (run_id),
    UNIQUE KEY uq_ranking_runs_type_effective (ranking_type, effective_at)
);

CREATE TABLE IF NOT EXISTS exchange_ranking_signals (
    run_id          BIGINT UNSIGNED NOT NULL,
    exchange_code   VARCHAR(32)     NOT NULL,
    metric_key      VARCHAR(64)     NOT NULL,
    metric_value    DECIMAL(32,12)  NULL,
    metric_text     VARCHAR(255)    NULL,
    weight          DECIMAL(8,4)    NULL,
    source          VARCHAR(128)    NULL,
    observed_at     DATETIME        NULL,
    metadata        JSON            NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (run_id, exchange_code, metric_key),
    INDEX idx_exchange_ranking_signals_exchange (exchange_code),
    INDEX idx_exchange_ranking_signals_metric (metric_key),
    CONSTRAINT fk_exchange_ranking_signals_run FOREIGN KEY (run_id)
        REFERENCES ranking_runs (run_id) ON DELETE CASCADE,
    CONSTRAINT fk_exchange_ranking_signals_exchange FOREIGN KEY (exchange_code)
        REFERENCES exchanges_catalog (code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS asset_ranking_signals (
    run_id          BIGINT UNSIGNED NOT NULL,
    asset_symbol    VARCHAR(64)     NOT NULL,
    asset_type      VARCHAR(32)     NULL,
    metric_key      VARCHAR(64)     NOT NULL,
    metric_value    DECIMAL(32,12)  NULL,
    metric_text     VARCHAR(255)    NULL,
    weight          DECIMAL(8,4)    NULL,
    source          VARCHAR(128)    NULL,
    observed_at     DATETIME        NULL,
    metadata        JSON            NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (run_id, asset_symbol, metric_key),
    INDEX idx_asset_ranking_signals_symbol (asset_symbol),
    INDEX idx_asset_ranking_signals_metric (metric_key),
    CONSTRAINT fk_asset_ranking_signals_run FOREIGN KEY (run_id)
        REFERENCES ranking_runs (run_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exchange_ranking_results (
    run_id              BIGINT UNSIGNED NOT NULL,
    exchange_code       VARCHAR(32)     NOT NULL,
    rank_position       INT UNSIGNED    NOT NULL,
    composite_score     DECIMAL(16,6)   NOT NULL,
    normalized_score    DECIMAL(16,6)   NULL,
    total_weight        DECIMAL(8,4)    NULL,
    status              ENUM('candidate', 'selected', 'excluded') NOT NULL DEFAULT 'candidate',
    rationale           TEXT            NULL,
    metadata            JSON            NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (run_id, exchange_code),
    UNIQUE KEY uq_exchange_ranking_results_position (run_id, rank_position),
    CONSTRAINT fk_exchange_ranking_results_run FOREIGN KEY (run_id)
        REFERENCES ranking_runs (run_id) ON DELETE CASCADE,
    CONSTRAINT fk_exchange_ranking_results_exchange FOREIGN KEY (exchange_code)
        REFERENCES exchanges_catalog (code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS asset_ranking_results (
    run_id              BIGINT UNSIGNED NOT NULL,
    asset_symbol        VARCHAR(64)     NOT NULL,
    asset_type          VARCHAR(32)     NULL,
    rank_position       INT UNSIGNED    NOT NULL,
    composite_score     DECIMAL(16,6)   NOT NULL,
    normalized_score    DECIMAL(16,6)   NULL,
    total_weight        DECIMAL(8,4)    NULL,
    status              ENUM('candidate', 'selected', 'excluded') NOT NULL DEFAULT 'candidate',
    rationale           TEXT            NULL,
    metadata            JSON            NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (run_id, asset_symbol),
    UNIQUE KEY uq_asset_ranking_results_position (run_id, rank_position),
    INDEX idx_asset_ranking_results_symbol (asset_symbol),
    CONSTRAINT fk_asset_ranking_results_run FOREIGN KEY (run_id)
        REFERENCES ranking_runs (run_id) ON DELETE CASCADE
);
