-- Stored procedures to upsert exchange and asset ranking data.

DROP PROCEDURE IF EXISTS upsert_ranking_run;
CREATE PROCEDURE upsert_ranking_run (
    IN p_run_id BIGINT UNSIGNED,
    IN p_ranking_type VARCHAR(32),
    IN p_effective_at DATETIME,
    IN p_description VARCHAR(255),
    IN p_status VARCHAR(32),
    IN p_metadata JSON,
    IN p_parameters JSON
)
BEGIN
    IF p_run_id IS NOT NULL AND p_run_id <> 0 THEN
        INSERT INTO ranking_runs (
            run_id, ranking_type, effective_at, description, status, metadata, parameters
        ) VALUES (
            p_run_id, p_ranking_type, p_effective_at, p_description, COALESCE(p_status, 'pending'), p_metadata, p_parameters
        )
        ON DUPLICATE KEY UPDATE
            ranking_type = VALUES(ranking_type),
            effective_at = VALUES(effective_at),
            description = VALUES(description),
            status = VALUES(status),
            metadata = VALUES(metadata),
            parameters = VALUES(parameters);

        SELECT p_run_id AS run_id;
    ELSE
        INSERT INTO ranking_runs (
            ranking_type, effective_at, description, status, metadata, parameters
        ) VALUES (
            p_ranking_type, p_effective_at, p_description, COALESCE(p_status, 'pending'), p_metadata, p_parameters
        )
        ON DUPLICATE KEY UPDATE
            description = VALUES(description),
            status = VALUES(status),
            metadata = VALUES(metadata),
            parameters = VALUES(parameters);

        SELECT run_id
        FROM ranking_runs
        WHERE ranking_type = p_ranking_type
          AND effective_at = p_effective_at
        ORDER BY run_id DESC
        LIMIT 1;
    END IF;
END;

DROP PROCEDURE IF EXISTS upsert_exchange_ranking_signal;
CREATE PROCEDURE upsert_exchange_ranking_signal (
    IN p_run_id BIGINT UNSIGNED,
    IN p_exchange_code VARCHAR(32),
    IN p_metric_key VARCHAR(64),
    IN p_metric_value DECIMAL(32,12),
    IN p_metric_text VARCHAR(255),
    IN p_weight DECIMAL(8,4),
    IN p_source VARCHAR(128),
    IN p_observed_at DATETIME,
    IN p_metadata JSON
)
BEGIN
    INSERT INTO exchange_ranking_signals (
        run_id, exchange_code, metric_key, metric_value, metric_text, weight, source, observed_at, metadata
    ) VALUES (
        p_run_id, p_exchange_code, p_metric_key, p_metric_value, p_metric_text, p_weight, p_source, p_observed_at, p_metadata
    )
    ON DUPLICATE KEY UPDATE
        metric_value = VALUES(metric_value),
        metric_text = VALUES(metric_text),
        weight = VALUES(weight),
        source = VALUES(source),
        observed_at = VALUES(observed_at),
        metadata = VALUES(metadata);
END;

DROP PROCEDURE IF EXISTS upsert_asset_ranking_signal;
CREATE PROCEDURE upsert_asset_ranking_signal (
    IN p_run_id BIGINT UNSIGNED,
    IN p_asset_symbol VARCHAR(64),
    IN p_asset_type VARCHAR(32),
    IN p_metric_key VARCHAR(64),
    IN p_metric_value DECIMAL(32,12),
    IN p_metric_text VARCHAR(255),
    IN p_weight DECIMAL(8,4),
    IN p_source VARCHAR(128),
    IN p_observed_at DATETIME,
    IN p_metadata JSON
)
BEGIN
    INSERT INTO asset_ranking_signals (
        run_id, asset_symbol, asset_type, metric_key, metric_value, metric_text, weight, source, observed_at, metadata
    ) VALUES (
        p_run_id, p_asset_symbol, p_asset_type, p_metric_key, p_metric_value, p_metric_text, p_weight, p_source, p_observed_at, p_metadata
    )
    ON DUPLICATE KEY UPDATE
        asset_type = VALUES(asset_type),
        metric_value = VALUES(metric_value),
        metric_text = VALUES(metric_text),
        weight = VALUES(weight),
        source = VALUES(source),
        observed_at = VALUES(observed_at),
        metadata = VALUES(metadata);
END;

DROP PROCEDURE IF EXISTS upsert_exchange_ranking_result;
CREATE PROCEDURE upsert_exchange_ranking_result (
    IN p_run_id BIGINT UNSIGNED,
    IN p_exchange_code VARCHAR(32),
    IN p_rank_position INT UNSIGNED,
    IN p_composite_score DECIMAL(16,6),
    IN p_normalized_score DECIMAL(16,6),
    IN p_total_weight DECIMAL(8,4),
    IN p_status VARCHAR(32),
    IN p_rationale TEXT,
    IN p_metadata JSON
)
BEGIN
    INSERT INTO exchange_ranking_results (
        run_id, exchange_code, rank_position, composite_score, normalized_score, total_weight, status, rationale, metadata
    ) VALUES (
        p_run_id, p_exchange_code, p_rank_position, p_composite_score, p_normalized_score, p_total_weight, COALESCE(p_status, 'candidate'), p_rationale, p_metadata
    )
    ON DUPLICATE KEY UPDATE
        rank_position = VALUES(rank_position),
        composite_score = VALUES(composite_score),
        normalized_score = VALUES(normalized_score),
        total_weight = VALUES(total_weight),
        status = VALUES(status),
        rationale = VALUES(rationale),
        metadata = VALUES(metadata);
END;

DROP PROCEDURE IF EXISTS upsert_asset_ranking_result;
CREATE PROCEDURE upsert_asset_ranking_result (
    IN p_run_id BIGINT UNSIGNED,
    IN p_asset_symbol VARCHAR(64),
    IN p_asset_type VARCHAR(32),
    IN p_rank_position INT UNSIGNED,
    IN p_composite_score DECIMAL(16,6),
    IN p_normalized_score DECIMAL(16,6),
    IN p_total_weight DECIMAL(8,4),
    IN p_status VARCHAR(32),
    IN p_rationale TEXT,
    IN p_metadata JSON
)
BEGIN
    INSERT INTO asset_ranking_results (
        run_id, asset_symbol, asset_type, rank_position, composite_score, normalized_score, total_weight, status, rationale, metadata
    ) VALUES (
        p_run_id, p_asset_symbol, p_asset_type, p_rank_position, p_composite_score, p_normalized_score, p_total_weight, COALESCE(p_status, 'candidate'), p_rationale, p_metadata
    )
    ON DUPLICATE KEY UPDATE
        asset_type = VALUES(asset_type),
        rank_position = VALUES(rank_position),
        composite_score = VALUES(composite_score),
        normalized_score = VALUES(normalized_score),
        total_weight = VALUES(total_weight),
        status = VALUES(status),
        rationale = VALUES(rationale),
        metadata = VALUES(metadata);
END;
