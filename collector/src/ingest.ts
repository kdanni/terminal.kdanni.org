import { getDatabasePool } from './database.js';

type DatabasePool = Awaited<ReturnType<typeof getDatabasePool>>;

type EquityWatch = {
  symbol: string;
  name: string;
  currencyCode: string;
  stooqSymbol: string;
};

type FxWatch = {
  baseCurrency: string;
  quoteCurrency: string;
  stooqSymbol: string;
};

type StooqRow = {
  ts: Date;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
};

export interface IngestionReport {
  providerCode: string;
  equities: { symbol: string; rowsUpserted: number }[];
  fx: { pair: string; rowsUpserted: number }[];
}

const STOOQ_PROVIDER = {
  code: 'stooq',
  name: 'Stooq Free Data',
  baseUrl: 'https://stooq.com',
} as const;

const DEFAULT_EXCHANGE = {
  code: 'NASDAQ',
  name: 'NASDAQ',
  country: 'US',
  timezone: 'America/New_York',
  mic: 'XNAS',
} as const;

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', decimals: 2 },
  { code: 'EUR', name: 'Euro', decimals: 2 },
  { code: 'HUF', name: 'Hungarian Forint', decimals: 2 },
] as const;

const EQUITY_WATCHLIST: EquityWatch[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', currencyCode: 'USD', stooqSymbol: 'aapl.us' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', currencyCode: 'USD', stooqSymbol: 'msft.us' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', currencyCode: 'USD', stooqSymbol: 'googl.us' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', currencyCode: 'USD', stooqSymbol: 'amzn.us' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', currencyCode: 'USD', stooqSymbol: 'nvda.us' },
  { symbol: 'META', name: 'Meta Platforms, Inc.', currencyCode: 'USD', stooqSymbol: 'meta.us' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', currencyCode: 'USD', stooqSymbol: 'tsla.us' },
];

const FX_WATCHLIST: FxWatch[] = [
  { baseCurrency: 'EUR', quoteCurrency: 'USD', stooqSymbol: 'eurusd' },
  { baseCurrency: 'USD', quoteCurrency: 'HUF', stooqSymbol: 'usdhuf' },
  { baseCurrency: 'EUR', quoteCurrency: 'HUF', stooqSymbol: 'eurhuf' },
];

const MAX_ROWS_PER_SERIES = 60;

function parseNumeric(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed === '' || trimmed === 'nan') {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchStooqSeries(symbol: string): Promise<StooqRow[]> {
  const response = await fetch(`https://stooq.com/q/d/l/?s=${symbol}&i=d`);

  if (!response.ok) {
    throw new Error(`Failed to fetch data for ${symbol} from Stooq: ${response.status} ${response.statusText}`);
  }

  const body = await response.text();
  const lines = body.trim().split(/\r?\n/);

  if (lines.length <= 1) {
    return [];
  }

  const [, ...dataLines] = lines;
  const rows: StooqRow[] = [];

  for (const line of dataLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const [date, open, high, low, close, volume] = trimmed.split(',');

    if (!date || date === '0000-00-00') {
      continue;
    }

    const ts = new Date(`${date}T00:00:00Z`);

    if (Number.isNaN(ts.getTime())) {
      continue;
    }

    rows.push({
      ts,
      open: parseNumeric(open),
      high: parseNumeric(high),
      low: parseNumeric(low),
      close: parseNumeric(close),
      volume: parseNumeric(volume),
    });
  }

  rows.sort((a, b) => a.ts.getTime() - b.ts.getTime());
  return rows.slice(-MAX_ROWS_PER_SERIES);
}

async function ensureProvider(pool: DatabasePool): Promise<number> {
  const result = await pool.query<{ id: number }>(
    'SELECT upsert_provider($1, $2, $3) AS id',
    [STOOQ_PROVIDER.code, STOOQ_PROVIDER.name, STOOQ_PROVIDER.baseUrl]
  );

  return result.rows[0]?.id as number;
}

async function ensureCurrencies(pool: DatabasePool): Promise<void> {
  for (const currency of CURRENCIES) {
    await pool.query('SELECT upsert_currency($1, $2, $3)', [
      currency.code,
      currency.name,
      currency.decimals,
    ]);
  }
}

async function ensureExchange(pool: DatabasePool): Promise<number> {
  const result = await pool.query<{ id: number }>(
    'SELECT upsert_exchange($1, $2, $3, $4, $5) AS id',
    [
      DEFAULT_EXCHANGE.code,
      DEFAULT_EXCHANGE.name,
      DEFAULT_EXCHANGE.country,
      DEFAULT_EXCHANGE.timezone,
      DEFAULT_EXCHANGE.mic,
    ]
  );

  return result.rows[0]?.id as number;
}

async function ensureSecurity(
  pool: DatabasePool,
  params: EquityWatch & { exchangeId: number }
): Promise<number> {
  const result = await pool.query<{ id: number }>(
    "SELECT upsert_security($1, $2, $3, $4, 'equity') AS id",
    [params.exchangeId, params.symbol, params.name, params.currencyCode]
  );

  return result.rows[0]?.id as number;
}

async function ensureSymbol(
  pool: DatabasePool,
  securityId: number,
  providerId: number,
  providerSymbol: string
): Promise<void> {
  await pool.query('SELECT upsert_symbol($1, $2, $3)', [securityId, providerId, providerSymbol]);
}

async function upsertPriceSeries(
  pool: DatabasePool,
  securityId: number,
  providerId: number,
  rows: StooqRow[]
): Promise<number> {
  const validRows = rows.filter((row) => row.close !== null);

  if (validRows.length === 0) {
    return 0;
  }

  let affectedRows = 0;

  for (const row of validRows) {
    const result = await pool.query<{ affected: number }>(
      'SELECT upsert_price_series($1, $2, $3, $4, $5, $6, $7, $8, $9) AS affected',
      [
        securityId,
        row.ts,
        '1d',
        row.open,
        row.high,
        row.low,
        row.close,
        row.volume,
        providerId,
      ]
    );

    affectedRows += result.rows[0]?.affected ?? 0;
  }

  return affectedRows;
}

async function upsertFxSeries(
  pool: DatabasePool,
  providerId: number,
  watch: FxWatch,
  rows: StooqRow[]
): Promise<number> {
  const validRows = rows.filter((row) => row.close !== null);

  if (validRows.length === 0) {
    return 0;
  }

  let affectedRows = 0;

  for (const row of validRows) {
    const result = await pool.query<{ affected: number }>(
      'SELECT upsert_fx_rate($1, $2, $3, $4, $5) AS affected',
      [watch.baseCurrency, watch.quoteCurrency, row.ts, row.close, providerId]
    );

    affectedRows += result.rows[0]?.affected ?? 0;
  }

  return affectedRows;
}

export async function collectReferenceDataAndSeries(): Promise<IngestionReport> {
  const pool = await getDatabasePool();

  await ensureCurrencies(pool);
  const providerId = await ensureProvider(pool);
  const exchangeId = await ensureExchange(pool);

  const equityResults: IngestionReport['equities'] = [];

  for (const watch of EQUITY_WATCHLIST) {
    const securityId = await ensureSecurity(pool, { ...watch, exchangeId });
    await ensureSymbol(pool, securityId, providerId, watch.stooqSymbol);
    const series = await fetchStooqSeries(watch.stooqSymbol);
    const rowsUpserted = await upsertPriceSeries(pool, securityId, providerId, series);
    equityResults.push({ symbol: watch.symbol, rowsUpserted });
  }

  const fxResults: IngestionReport['fx'] = [];

  for (const watch of FX_WATCHLIST) {
    const series = await fetchStooqSeries(watch.stooqSymbol);
    const rowsUpserted = await upsertFxSeries(pool, providerId, watch, series);
    fxResults.push({ pair: `${watch.baseCurrency}/${watch.quoteCurrency}`, rowsUpserted });
  }

  return {
    providerCode: STOOQ_PROVIDER.code,
    equities: equityResults,
    fx: fxResults,
  };
}
