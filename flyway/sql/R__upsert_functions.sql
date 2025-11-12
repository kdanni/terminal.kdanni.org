-- Idempotent stored procedures for ingestion services.
CREATE OR REPLACE FUNCTION upsert_exchange(
  p_code TEXT,
  p_name TEXT,
  p_country TEXT,
  p_timezone TEXT,
  p_mic TEXT
) RETURNS BIGINT AS
$$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO exchanges (code, name, country, timezone, mic)
  VALUES (p_code, p_name, p_country, p_timezone, p_mic)
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        country = EXCLUDED.country,
        timezone = EXCLUDED.timezone,
        mic = EXCLUDED.mic
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION upsert_currency(
  p_code TEXT,
  p_name TEXT,
  p_decimals SMALLINT
) RETURNS VOID AS
$$
BEGIN
  INSERT INTO currencies (code, name, decimals)
  VALUES (p_code, p_name, p_decimals)
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        decimals = EXCLUDED.decimals;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION upsert_provider(
  p_code TEXT,
  p_name TEXT,
  p_base_url TEXT
) RETURNS BIGINT AS
$$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO providers (code, name, base_url)
  VALUES (p_code, p_name, p_base_url)
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        base_url = EXCLUDED.base_url
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION upsert_security(
  p_exchange_id BIGINT,
  p_symbol TEXT,
  p_name TEXT,
  p_currency_code TEXT,
  p_type TEXT DEFAULT 'equity'
) RETURNS BIGINT AS
$$
DECLARE
  v_id BIGINT;
BEGIN
  SELECT id INTO v_id
  FROM securities
  WHERE exchange_id = p_exchange_id
    AND symbol = p_symbol;

  IF v_id IS NULL THEN
    INSERT INTO securities (exchange_id, symbol, name, currency_code, type)
    VALUES (p_exchange_id, p_symbol, p_name, p_currency_code, p_type)
    RETURNING id INTO v_id;
  ELSE
    UPDATE securities
    SET name = p_name,
        currency_code = p_currency_code,
        type = p_type
    WHERE id = v_id
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION upsert_symbol(
  p_security_id BIGINT,
  p_provider_id BIGINT,
  p_provider_sym TEXT
) RETURNS VOID AS
$$
BEGIN
  INSERT INTO symbols (security_id, provider_id, provider_sym)
  VALUES (p_security_id, p_provider_id, p_provider_sym)
  ON CONFLICT (provider_id, provider_sym) DO UPDATE
    SET security_id = EXCLUDED.security_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION upsert_price_series(
  p_security_id BIGINT,
  p_ts TIMESTAMPTZ,
  p_interval TEXT,
  p_open NUMERIC,
  p_high NUMERIC,
  p_low NUMERIC,
  p_close NUMERIC,
  p_volume NUMERIC,
  p_source_id BIGINT
) RETURNS INTEGER AS
$$
DECLARE
  v_result INTEGER;
BEGIN
  INSERT INTO price_series (security_id, ts, interval, open, high, low, close, volume, source_id)
  VALUES (p_security_id, p_ts, p_interval, p_open, p_high, p_low, p_close, p_volume, p_source_id)
  ON CONFLICT (security_id, ts, interval, source_id) DO UPDATE
    SET open = EXCLUDED.open,
        high = EXCLUDED.high,
        low = EXCLUDED.low,
        close = EXCLUDED.close,
        volume = EXCLUDED.volume,
        ingest_ts = NOW()
  RETURNING 1 INTO v_result;

  RETURN COALESCE(v_result, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION upsert_fx_rate(
  p_base_ccy TEXT,
  p_quote_ccy TEXT,
  p_ts TIMESTAMPTZ,
  p_rate NUMERIC,
  p_source_id BIGINT
) RETURNS INTEGER AS
$$
DECLARE
  v_result INTEGER;
BEGIN
  INSERT INTO fx_rates (base_ccy, quote_ccy, ts, rate, source_id)
  VALUES (p_base_ccy, p_quote_ccy, p_ts, p_rate, p_source_id)
  ON CONFLICT (base_ccy, quote_ccy, ts, source_id) DO UPDATE
    SET rate = EXCLUDED.rate,
        ingest_ts = NOW()
  RETURNING 1 INTO v_result;

  RETURN COALESCE(v_result, 0);
END;
$$ LANGUAGE plpgsql;
