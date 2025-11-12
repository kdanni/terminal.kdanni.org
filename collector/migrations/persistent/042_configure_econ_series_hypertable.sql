DO
$$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    PERFORM create_hypertable('econ_series', by_range('ts'), if_not_exists => TRUE);
  ELSE
    RAISE NOTICE 'TimescaleDB not installed; econ_series hypertable was not created.';
  END IF;
END;
$$;
