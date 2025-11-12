DO
$$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'collector') THEN
    CREATE ROLE collector NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'analyst') THEN
    CREATE ROLE analyst NOLOGIN;
  END IF;
END;
$$;

GRANT USAGE ON SCHEMA public TO collector, analyst;
GRANT SELECT, INSERT ON price_series TO collector;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analyst;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO analyst;
