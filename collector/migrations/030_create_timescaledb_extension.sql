DO
$$
BEGIN
  BEGIN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS timescaledb';
  EXCEPTION
    WHEN undefined_file THEN
      RAISE NOTICE 'TimescaleDB extension is not available; continuing without it.';
  END;
END;
$$;
