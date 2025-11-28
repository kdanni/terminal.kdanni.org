using Microsoft.Data.Sqlite;
using Microsoft.Office.Interop.Excel;
using System.Runtime.InteropServices;
using System.Text.Json;

namespace StockHistoryApp;

public class Program
{
    public static void Main(string[] args)
    {
        var settings = LoadConfiguration("appsettings.json");
        var databasePath = string.IsNullOrWhiteSpace(settings.DatabasePath)
            ? "stockhistory.db"
            : settings.DatabasePath;

        var days = settings.Days > 0 ? settings.Days : 14;
        var tickers = (settings.Tickers ?? new List<string>())
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => t.Trim().ToUpperInvariant())
            .Distinct()
            .ToList();

        if (tickers.Count == 0)
        {
            Console.WriteLine("No valid tickers configured. Please update appsettings.json.");
            return;
        }

        Console.WriteLine($"Running STOCKHISTORY for {tickers.Count} tickers over the last {days} days...");

        var service = new StockHistoryService();
        var repository = new StockHistoryRepository(databasePath);
        repository.Initialize();

        foreach (var ticker in tickers)
        {
            Console.WriteLine($"Processing ticker: {ticker}");

            try
            {
                var records = service.GetHistory(ticker, days);

                if (records.Count == 0)
                {
                    Console.WriteLine($"No records returned for {ticker}; skipping save.");
                    continue;
                }

                Console.WriteLine($"Fetched {records.Count} rows from Excel for {ticker}. Persisting to SQLite...");

                repository.Save(records);

                Console.WriteLine($"Saved {records.Count} records for {ticker} to {databasePath}.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to process ticker {ticker}: {ex.Message}");
            }
        }
    }

    private static AppSettings LoadConfiguration(string path)
    {
        try
        {
            if (!File.Exists(path))
            {
                Console.WriteLine($"Configuration file '{path}' not found. Using defaults.");
                return new AppSettings();
            }

            var json = File.ReadAllText(path);
            var settings = JsonSerializer.Deserialize<AppSettings>(json);

            if (settings is null)
            {
                Console.WriteLine("Configuration file is empty or invalid. Using defaults.");
                return new AppSettings();
            }

            return settings;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to load configuration: {ex.Message}. Using defaults.");
            return new AppSettings();
        }
    }
}

public class AppSettings
{
    public string DatabasePath { get; set; } = "stockhistory.db";

    public int Days { get; set; } = 14;

    public List<string> Tickers { get; set; } = new();
}

public class StockHistoryRepository
{
    private readonly string _connectionString;

    public StockHistoryRepository(string databasePath)
    {
        _connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = databasePath
        }.ToString();
    }

    public void Initialize()
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();

        var command = connection.CreateCommand();
        command.CommandText = @"CREATE TABLE IF NOT EXISTS StockHistory (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Ticker TEXT NOT NULL,
            TradingDay TEXT NOT NULL,
            Open REAL,
            High REAL,
            Low REAL,
            Close REAL,
            Volume INTEGER
        );";

        command.ExecuteNonQuery();
    }

    public void Save(IEnumerable<StockRecord> records)
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();

        using var transaction = connection.BeginTransaction();
        foreach (var record in records)
        {
            var insert = connection.CreateCommand();
            insert.CommandText = @"INSERT INTO StockHistory (Ticker, TradingDay, Open, High, Low, Close, Volume)
                VALUES ($Ticker, $TradingDay, $Open, $High, $Low, $Close, $Volume);";

            insert.Parameters.AddWithValue("$Ticker", record.Ticker);
            insert.Parameters.AddWithValue("$TradingDay", record.TradingDay.ToString("yyyy-MM-dd"));
            insert.Parameters.AddWithValue("$Open", record.Open);
            insert.Parameters.AddWithValue("$High", record.High);
            insert.Parameters.AddWithValue("$Low", record.Low);
            insert.Parameters.AddWithValue("$Close", record.Close);
            insert.Parameters.AddWithValue("$Volume", record.Volume);

            insert.ExecuteNonQuery();
        }

        transaction.Commit();
    }
}

public class StockHistoryService
{
    public List<StockRecord> GetHistory(string ticker, int days)
    {
        var excelApp = new Application
        {
            Visible = false,
            DisplayAlerts = false
        };

        try
        {
            var workbook = excelApp.Workbooks.Add();
            var sheet = (Worksheet)workbook.Sheets[1];

            // 0 = daily frequency, 1 = headers, 2-6 return OHLCV columns.
            sheet.Range["A1"].Formula = $"=STOCKHISTORY(\"{ticker}\", TODAY()-{days}, TODAY()-1, 0, 1, 2, 3, 4, 5, 6)";

            workbook.Calculate();
            var dataRange = sheet.Range["A1"].CurrentRegion;
            var values = (object[,])dataRange.Value2!;

            return MapRecords(values, ticker);
        }
        finally
        {
            excelApp.Workbooks.Close();
            excelApp.Quit();

            if (excelApp is not null)
            {
                Marshal.FinalReleaseComObject(excelApp);
            }
        }
    }

    private static List<StockRecord> MapRecords(object[,] values, string ticker)
    {
        var records = new List<StockRecord>();

        // Skip header row at index 1.
        for (var row = 2; row <= values.GetLength(0); row++)
        {
            if (values[row, 1] is not double serialDate)
            {
                continue;
            }

            var tradingDay = DateTime.FromOADate(serialDate);

            var open = values[row, 2] as double?;
            var high = values[row, 3] as double?;
            var low = values[row, 4] as double?;
            var close = values[row, 5] as double?;
            var volume = values[row, 6] as double?;

            records.Add(new StockRecord
            {
                Ticker = ticker,
                TradingDay = tradingDay,
                Open = open,
                High = high,
                Low = low,
                Close = close,
                Volume = volume.HasValue ? Convert.ToInt64(volume.Value) : null
            });
        }

        return records;
    }
}

public class StockRecord
{
    public string Ticker { get; set; } = string.Empty;
    public DateTime TradingDay { get; set; }
    public double? Open { get; set; }
    public double? High { get; set; }
    public double? Low { get; set; }
    public double? Close { get; set; }
    public long? Volume { get; set; }
}
