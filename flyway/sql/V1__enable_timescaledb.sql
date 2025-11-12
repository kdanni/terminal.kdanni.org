-- Enable TimescaleDB extensions when available. This mirrors the legacy
-- persistent migrations 030/031 in the collector service.
DO
$$
BEGIN
  BEGIN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS timescaledb';
  EXCEPTION
    WHEN undefined_file THEN
      RAISE NOTICE 'TimescaleDB extension is not available; continuing without it.';
  END;

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
