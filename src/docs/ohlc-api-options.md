# OHLC Market Data API Options

This document summarizes leading market data APIs that can provide open-high-low-close (OHLC) bars suitable for populating the `ohlcv_data` hypertable. Each option includes free tier considerations, redundancy notes, and integration tips for the new data collection tasks.

## Twelve Data

- **Base URL:** `https://api.twelvedata.com`
- **Primary endpoint:** `time_series`
- **Coverage:** Equities, forex, crypto, ETFs, funds, indices, and commodities with global exchange coverage.
- **Intervals:** Extensive selection from `1min` to `1month`. Intraday intervals <=1min require paid tiers.
- **Free tier:** 800 requests/day, 8/min, supports 30-day historical depth per call.
- **Authentication:** API key via `TWELVE_DATA_API_KEY`.
- **Notes:** Provides exchange routing via `exchange` parameter. Supports CSV/JSON, but JSON responses are used by the client.

## Alpha Vantage

- **Base URL:** `https://www.alphavantage.co`
- **Primary endpoints:** `TIME_SERIES_DAILY_ADJUSTED` (daily), `TIME_SERIES_INTRADAY` (intraday intervals from 1–60 minutes).
- **Coverage:** U.S. equities and ETFs, limited global support; forex and crypto require alternate endpoints.
- **Intervals:** Daily adjusted + intraday granularities (`1min`, `5min`, `15min`, `30min`, `60min`).
- **Free tier:** 25 requests/day, 5/min. Burst control recommended via per-provider throttling.
- **Authentication:** API key via `ALPHA_VANTAGE_API_KEY`.
- **Notes:** Intraday endpoint requires `interval` parameter; most responses are in time-series JSON keyed by ISO timestamps.

## Finnhub

- **Base URL:** `https://finnhub.io/api/v1`
- **Primary endpoint:** `stock/candle` for OHLC data.
- **Coverage:** Broad global equities, forex, crypto, and indices. Exchange parameterization handled via FIGI or symbol mapping.
- **Intervals (resolution):** `1`, `5`, `15`, `30`, `60`, `D`, `W`, `M` (minutes, daily, weekly, monthly).
- **Free tier:** 60 API calls/minute, 30,000 calls/month for individual developers; real-time data limited.
- **Authentication:** API key via `FINNHUB_API_KEY`.
- **Notes:** Returns arrays for each field (t, o, h, l, c, v) that need to be zipped into bar objects.

## Redundancy Strategy

- Twelve Data remains the primary provider because it already underpins asset catalog ingestion and offers the broadest coverage from a single endpoint. Finnhub and Alpha Vantage act as redundant sources:
  - **Failover order:** Twelve Data → Finnhub → Alpha Vantage.
  - **Coverage gaps:** Alpha Vantage fills U.S. equity gaps if Twelve Data throttles; Finnhub handles broader international coverage with generous rate limits.
  - **Task behavior:** The data collection task iterates through providers until one delivers OHLC bars for a given symbol/interval, increasing resiliency against outages or rate-limit exhaustion.

## Environment Variables

Set the following environment variables before running `npm run ohlc:collect:*` tasks:

| Provider       | Environment Variable       |
| -------------- | -------------------------- |
| Twelve Data    | `TWELVE_DATA_API_KEY`      |
| Alpha Vantage  | `ALPHA_VANTAGE_API_KEY`    |
| Finnhub        | `FINNHUB_API_KEY`          |

All keys are cached in-process to avoid redundant environment lookups. The loader functions reject placeholder/demo keys so that production secrets are required for scheduled runs.
