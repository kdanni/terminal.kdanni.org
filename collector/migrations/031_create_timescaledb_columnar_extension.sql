DO
$$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    BEGIN
      EXECUTE 'CREATE EXTENSION IF NOT EXISTS timescaledb_columnar';
    EXCEPTION
      WHEN undefined_file THEN
        RAISE NOTICE 'timescaledb_columnar extension is not available; continuing without it.';
      WHEN others THEN
        RAISE NOTICE 'timescaledb_columnar extension could not be installed: %', SQLERRM;
    END;
  END IF;
END;
$$;
