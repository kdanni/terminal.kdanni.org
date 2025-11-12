DO
$$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    PERFORM create_hypertable('price_series', by_range('ts'), if_not_exists => TRUE);

    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb_columnar') THEN
      BEGIN
        EXECUTE $columnar$
          ALTER TABLE price_series
          SET (
            timescaledb.columnar = true,
            timescaledb.compress = true,
            timescaledb.compress_segmentby = 'security_id,interval,source_id',
            timescaledb.compress_orderby = 'ts DESC'
          )
        $columnar$;
      EXCEPTION
        WHEN undefined_object OR invalid_parameter_value THEN
          RAISE NOTICE 'Columnar compression settings could not be applied to price_series: %', SQLERRM;
      END;
      PERFORM add_compression_policy('price_series', INTERVAL '7 days');  
      PERFORM add_retention_policy('price_series', INTERVAL '2 years', schedule_interval => INTERVAL '1 day');
    ELSE
      RAISE NOTICE 'timescaledb_columnar extension not installed; price_series will remain row-store.';
    END IF;

  ELSE
    RAISE NOTICE 'TimescaleDB not installed; price_series hypertable was not created.';
  END IF;
END;
$$;
