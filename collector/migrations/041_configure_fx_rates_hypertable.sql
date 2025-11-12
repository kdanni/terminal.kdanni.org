DO
$$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    PERFORM create_hypertable('fx_rates', by_range('ts'), if_not_exists => TRUE);
  ELSE
    RAISE NOTICE 'TimescaleDB not installed; fx_rates hypertable was not created.';
  END IF;
END;
$$;
