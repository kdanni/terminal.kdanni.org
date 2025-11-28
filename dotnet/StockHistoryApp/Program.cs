using Microsoft.Data.Sqlite;
using Microsoft.Office.Interop.Excel;
using System.Runtime.InteropServices;

namespace StockHistoryApp;

public class Program
{
    public static void Main(string[] args)
    {
        var databasePath = "stockhistory.db";
        var ticker = "MSFT";
        var days = 14;

        Console.WriteLine($"Running STOCKHISTORY for {ticker} over the last {days} days...");

        var service = new StockHistoryService();
        var records = service.GetHistory(ticker, days);

        Console.WriteLine($"Fetched {records.Count} rows from Excel. Persisting to SQLite...");

        var repository = new StockHistoryRepository(databasePath);
        repository.Initialize();
        repository.Save(records);

        Console.WriteLine($"Saved {records.Count} records to {databasePath}.");
    }
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
            insert.CommandText = @"INSERT INTO StockHistory (TradingDay, Open, High, Low, Close, Volume)
                VALUES ($TradingDay, $Open, $High, $Low, $Close, $Volume);";

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

            return MapRecords(values);
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

    private static List<StockRecord> MapRecords(object[,] values)
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
    public DateTime TradingDay { get; set; }
    public double? Open { get; set; }
    public double? High { get; set; }
    public double? Low { get; set; }
    public double? Close { get; set; }
    public long? Volume { get; set; }
}
