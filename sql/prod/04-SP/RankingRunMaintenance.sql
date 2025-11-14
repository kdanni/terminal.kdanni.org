-- Helper stored procedures for managing ranking runs.

DROP PROCEDURE IF EXISTS finalize_ranking_run;
CREATE PROCEDURE finalize_ranking_run (
    IN p_run_id BIGINT UNSIGNED,
    IN p_status VARCHAR(32),
    IN p_description VARCHAR(255),
    IN p_metadata JSON
)
BEGIN
    UPDATE ranking_runs
    SET
        status = COALESCE(p_status, status),
        description = COALESCE(p_description, description),
        metadata = COALESCE(p_metadata, metadata),
        updated_at = CURRENT_TIMESTAMP
    WHERE run_id = p_run_id;
END;

DROP PROCEDURE IF EXISTS reset_ranking_run;
CREATE PROCEDURE reset_ranking_run (
    IN p_run_id BIGINT UNSIGNED
)
BEGIN
    DELETE FROM exchange_ranking_results WHERE run_id = p_run_id;
    DELETE FROM asset_ranking_results WHERE run_id = p_run_id;
    DELETE FROM exchange_ranking_signals WHERE run_id = p_run_id;
    DELETE FROM asset_ranking_signals WHERE run_id = p_run_id;

    UPDATE ranking_runs
    SET status = 'pending',
        updated_at = CURRENT_TIMESTAMP
    WHERE run_id = p_run_id;
END;
