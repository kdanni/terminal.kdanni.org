# StockHistoryApp

A .NET 8.0 console tool that uses Excel's `STOCKHISTORY` function to pull historical OHLCV data for configured tickers and persist it into a local SQLite database.

## Prerequisites
- **.NET SDK:** `net8.0-windows` (Windows required because of Excel COM interop).
- **Microsoft Excel:** Desktop Excel with the `STOCKHISTORY` function available (Microsoft 365 or Excel 2021+). Excel must be installed locally and licensed. The app automates Excel via COM, so it must run on the same Windows machine as the SDK.
- **SQLite:** No manual install required; the `Microsoft.Data.Sqlite` package creates a local `.db` file. Ensure the process has write access to the output directory.

## Restore, build, and run
```bash
# Restore NuGet packages
cd dotnet/StockHistoryApp
dotnet restore

# Run with configuration from appsettings.json
dotnet run

# Override the backfill window (e.g., 30 days)
dotnet run -- --days 30
```

### Expected behavior
- The app logs the resolved backfill window and each ticker being processed.
- Excel opens invisibly to evaluate `STOCKHISTORY` and returns rows for each ticker.
- A SQLite file (default: `stockhistory.db` in the working directory) is created with a `StockHistory` table containing OHLCV rows per trading day.

## Configuration
Settings live in `appsettings.json`:

```json
{
  "DatabasePath": "stockhistory.db",
  "Days": 60,
  "Tickers": [
    "MSFT",
    "AAPL"
  ]
}
```

- `DatabasePath`: Path to the SQLite database file to create/use.
- `Days`: Default backfill window. Must be between 1 and 3650; can be overridden with `--days`.
- `Tickers`: List of tickers to fetch. Empty or whitespace-only entries are ignored; duplicates are de-duplicated. At least one valid ticker is required.

### Customizing tickers and backfill
- Edit `Tickers` to include the symbols you want (e.g., `"GOOG"`, `"NVDA"`).
- Adjust `Days` for the default window, or pass `--days <number>` on the command line to override for a single run.

## Limitations
- Requires Windows with a locally installed Excel; will not run headlessly or on non-Windows environments.
- The Excel `STOCKHISTORY` function depends on internet access and the availability of Microsoft's data provider; outages or network restrictions can cause empty results.
- Excel must remain responsive; if another instance is busy (e.g., modal dialogs), automation can fail.

## Troubleshooting
- **"No valid tickers configured"**: Add at least one ticker to `appsettings.json`.
- **COM/interop errors or Excel stays visible**: Ensure Excel is installed, not displaying modal dialogs, and that the bitness (32/64-bit) matches the installed .NET runtime.
- **Empty result set**: Verify the ticker symbol and that `STOCKHISTORY` works when entered directly into Excel for the same date range. Check internet connectivity.
- **Database not created**: Confirm the `DatabasePath` directory is writable; run from a folder where you have write permissions.
