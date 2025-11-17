import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Customized,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, useApiClient } from '../apiClient';

const DEFAULT_SYMBOLS = ['AAPL'];
const DEFAULT_INTERVAL = '1d';
const DEFAULT_RANGE = '3M';
const CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_SYMBOLS = 4;
const PAGE_SIZE = 500;

const LINE_COLORS = ['#2563eb', '#f97316', '#10b981', '#a855f7', '#ef4444'];

export type Candle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type OhlcvResponse = {
  data?: {
    symbol: string;
    interval: string;
    range: string;
    candles: Candle[];
  };
  pagination?: {
    total?: number;
    totalPages?: number;
    page?: number;
    pageSize?: number;
  };
};

type OhlcvSeries = {
  symbol: string;
  interval: string;
  range: string;
  candles: Candle[];
};

type ChartRow = {
  timestamp: string;
  label: string;
  volume?: number;
  [key: string]: string | number | undefined;
};

type OverlayState = {
  sma: boolean;
  ema: boolean;
  volume: boolean;
};

type CandlestickLayerProps = {
  primarySymbol?: string;
  xAxisMap?: Record<string, any>;
  yAxisMap?: Record<string, any>;
  data?: ChartRow[];
};

type OhlcvExplorerProps = {
  apiBaseUrl: string;
};

function formatDateLabel(timestamp: string): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
}

function computeSma(candles: Candle[], period: number): Map<string, number> {
  const results = new Map<string, number>();
  const window: number[] = [];

  candles.forEach((candle) => {
    window.push(candle.close);
    if (window.length > period) {
      window.shift();
    }

    if (window.length === period) {
      const average = window.reduce((total, value) => total + value, 0) / period;
      results.set(candle.timestamp, Number(average.toFixed(2)));
    }
  });

  return results;
}

function computeEma(candles: Candle[], period: number): Map<string, number> {
  const results = new Map<string, number>();
  const smoothing = 2 / (period + 1);
  let ema: number | null = null;

  candles.forEach((candle) => {
    if (ema == null) {
      ema = candle.close;
    } else {
      ema = candle.close * smoothing + ema * (1 - smoothing);
    }

    if (ema != null) {
      results.set(candle.timestamp, Number(ema.toFixed(2)));
    }
  });

  return results;
}

function parseSymbols(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[,\n]/)
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean)
    )
  ).slice(0, MAX_SYMBOLS);
}

function buildChartRows(seriesList: OhlcvSeries[], overlays: OverlayState): { rows: ChartRow[]; primary?: string } {
  if (!seriesList.length) {
    return { rows: [] };
  }

  const primarySymbol = seriesList[0]?.symbol;
  const rowMap = new Map<string, ChartRow>();
  const normalizedCloses = new Map<string, number>();

  seriesList.forEach((series) => {
    series.candles.forEach((candle) => {
      const existing = rowMap.get(candle.timestamp);
      const row: ChartRow = existing ?? { timestamp: candle.timestamp, label: formatDateLabel(candle.timestamp) };

      row[`open-${series.symbol}`] = candle.open;
      row[`high-${series.symbol}`] = candle.high;
      row[`low-${series.symbol}`] = candle.low;
      row[`close-${series.symbol}`] = candle.close;

      if (series.symbol === primarySymbol) {
        row.volume = candle.volume;
      }

      rowMap.set(candle.timestamp, row);
    });

    const firstClose = series.candles[0]?.close ?? 1;
    if (firstClose) {
      series.candles.forEach((candle) => {
        const baseline = candle.close / firstClose;
        normalizedCloses.set(`${candle.timestamp}-${series.symbol}`, Number(baseline.toFixed(4)));
      });
    }
  });

  const rows = Array.from(rowMap.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const primaryCandles = seriesList[0]?.candles ?? [];
  if (primarySymbol && overlays.sma) {
    const sma = computeSma(primaryCandles, 20);
    sma.forEach((value, timestamp) => {
      const row = rowMap.get(timestamp);
      if (row) {
        row.sma = value;
      }
    });
  }

  if (primarySymbol && overlays.ema) {
    const ema = computeEma(primaryCandles, 20);
    ema.forEach((value, timestamp) => {
      const row = rowMap.get(timestamp);
      if (row) {
        row.ema = value;
      }
    });
  }

  rows.forEach((row) => {
    seriesList.forEach((series) => {
      const normalized = normalizedCloses.get(`${row.timestamp}-${series.symbol}`);
      if (normalized != null) {
        row[`normalized-${series.symbol}`] = normalized;
      }
    });
  });

  return { rows, primary: primarySymbol };
}

function CandlestickLayer({ primarySymbol, xAxisMap, yAxisMap, data }: CandlestickLayerProps): JSX.Element | null {
  if (!primarySymbol || !xAxisMap || !yAxisMap || !data?.length) {
    return null;
  }

  const [xAxisKey] = Object.keys(xAxisMap);
  const xAxis = xAxisMap[xAxisKey];
  const priceAxis = yAxisMap.price ?? yAxisMap[yAxisMap && Object.keys(yAxisMap)[0]];

  if (!xAxis || !priceAxis || typeof xAxis?.scale !== 'function' || typeof priceAxis?.scale !== 'function') {
    return null;
  }

  const bandwidth = typeof xAxis.scale.bandwidth === 'function' ? xAxis.scale.bandwidth() : xAxis.bandSize ?? 8;
  const candleWidth = Math.max(4, Math.min(14, bandwidth * 0.8));

  return (
    <g>
      {data.map((entry) => {
        const open = entry[`open-${primarySymbol}`];
        const close = entry[`close-${primarySymbol}`];
        const high = entry[`high-${primarySymbol}`];
        const low = entry[`low-${primarySymbol}`];

        if (
          open == null ||
          close == null ||
          high == null ||
          low == null ||
          typeof open !== 'number' ||
          typeof close !== 'number' ||
          typeof high !== 'number' ||
          typeof low !== 'number'
        ) {
          return null;
        }

        const x = xAxis.scale(entry[xAxis.dataKey ?? 'timestamp']) + bandwidth / 2;
        const highY = priceAxis.scale(high);
        const lowY = priceAxis.scale(low);
        const openY = priceAxis.scale(open);
        const closeY = priceAxis.scale(close);
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(1, Math.abs(closeY - openY));
        const color = close >= open ? '#16a34a' : '#ef4444';

        return (
          <g key={entry.timestamp}>
            <line x1={x} x2={x} y1={highY} y2={lowY} stroke={color} strokeWidth={1.25} />
            <rect
              x={x - candleWidth / 2}
              y={bodyTop}
              width={candleWidth}
              height={bodyHeight}
              fill={color}
              opacity={0.9}
              rx={1.5}
            />
          </g>
        );
      })}
    </g>
  );
}

function ChartTooltip({ payload, label }: any): JSX.Element | null {
  if (!payload?.length) {
    return null;
  }

  const priceItems = payload.filter((item: any) => item.dataKey?.includes('close-'));
  const overlayItems = payload.filter((item: any) => item.dataKey === 'sma' || item.dataKey === 'ema');
  const volumeItem = payload.find((item: any) => item.dataKey === 'volume');

  return (
    <div className="tooltip-card">
      <p className="tooltip-title">{label}</p>
      <ul className="tooltip-list">
        {priceItems.map((item: any) => (
          <li key={item.dataKey} style={{ color: item.color }}>
            <span className="tooltip-label">{item.name}</span>
            <span>{Number(item.value).toFixed(2)}</span>
          </li>
        ))}
        {overlayItems.map((item: any) => (
          <li key={item.dataKey} style={{ color: item.color }}>
            <span className="tooltip-label">{item.name}</span>
            <span>{Number(item.value).toFixed(2)}</span>
          </li>
        ))}
        {volumeItem ? (
          <li className="tooltip-muted">
            <span className="tooltip-label">Volume</span>
            <span>{volumeItem.value?.toLocaleString?.() ?? volumeItem.value}</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

export function OhlcvExplorer({ apiBaseUrl }: OhlcvExplorerProps): JSX.Element {
  const [symbolInput, setSymbolInput] = useState(DEFAULT_SYMBOLS.join(', '));
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [interval, setInterval] = useState(DEFAULT_INTERVAL);
  const [range, setRange] = useState(DEFAULT_RANGE);
  const [view, setView] = useState<'candles' | 'line'>('candles');
  const [overlays, setOverlays] = useState<OverlayState>({ sma: true, ema: false, volume: true });
  const [series, setSeries] = useState<OhlcvSeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to visualize OHLCV data.');

  const cacheRef = useRef<Map<string, { fetchedAt: number; series: OhlcvSeries }>>(new Map());
  const { fetchWithAuth } = useApiClient(apiBaseUrl);

  const fetchSeries = useCallback(
    async (symbol: string, targetInterval: string, targetRange: string): Promise<OhlcvSeries> => {
      const cacheKey = `${symbol}-${targetInterval}-${targetRange}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.series;
      }

      const accumulated: Candle[] = [];
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const response = await fetchWithAuth(
          `${apiBaseUrl}/api/ohlcv?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(targetInterval)}&range=${encodeURIComponent(targetRange)}&page=${page}&pageSize=${PAGE_SIZE}`
        );

        if (!response.ok) {
          throw new ApiError(`Failed to load OHLCV for ${symbol}`, response.status);
        }

        const payload = (await response.json()) as OhlcvResponse;
        const candles = payload?.data?.candles ?? [];
        const pagination = payload?.pagination;
        accumulated.push(...candles);
        totalPages = pagination?.totalPages ?? 1;
        page += 1;

        if (!pagination?.totalPages || pagination.totalPages <= 1) {
          break;
        }
      }

      const nextSeries: OhlcvSeries = {
        symbol,
        interval: targetInterval,
        range: targetRange,
        candles: accumulated
      };

      cacheRef.current.set(cacheKey, { fetchedAt: Date.now(), series: nextSeries });
      return nextSeries;
    },
    [apiBaseUrl, fetchWithAuth]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadData(): Promise<void> {
      if (!selectedSymbols.length) {
        setSeries([]);
        return;
      }

      setLoading(true);
      setError(null);
      setStatusMessage('Loading data…');

      try {
        const responses = await Promise.all(
          selectedSymbols.map((symbol) => fetchSeries(symbol, interval, range))
        );

        if (cancelled) return;

        setSeries(responses);
        const sparse = responses.some((entry) => entry.candles.length < 5);
        setStatusMessage(sparse ? 'Limited history available—showing sparse dataset.' : 'Data refreshed from API cache.');
      } catch (fetchError) {
        if (cancelled) return;

        console.error(fetchError);
        const normalizedError =
          fetchError instanceof ApiError
            ? new Error(fetchError.message)
            : fetchError instanceof Error
              ? fetchError
              : new Error('Unable to load OHLCV data.');
        setError(normalizedError);
        setSeries([]);
        setStatusMessage('Encountered an error while loading data.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [fetchSeries, interval, range, selectedSymbols]);

  const chart = useMemo(() => buildChartRows(series, overlays), [series, overlays]);

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    const parsed = parseSymbols(symbolInput);
    setSelectedSymbols(parsed.length ? parsed : DEFAULT_SYMBOLS);
  };

  const toggleOverlay = (key: keyof OverlayState): void => {
    setOverlays((current) => ({ ...current, [key]: !current[key] }));
  };

  const showComparison = selectedSymbols.length > 1;
  const primarySymbol = chart.primary;

  return (
    <section className="page-shell">
      <header className="page-header">
        <p className="page-kicker">Analytics</p>
        <h1>OHLCV Visualization</h1>
        <p className="app-description">
          Explore price and volume history with candlesticks, overlays, and symbol comparisons. Data requests are cached to
          reduce repeat calls while exploring intervals and ranges.
        </p>
      </header>

      <form className="control-panel" onSubmit={handleSubmit}>
        <div className="control-group">
          <label htmlFor="symbols">Symbols</label>
          <input
            id="symbols"
            className="text-input"
            value={symbolInput}
            placeholder="Enter symbols separated by commas (e.g., AAPL, MSFT, NVDA)"
            onChange={(event) => setSymbolInput(event.target.value)}
          />
          <p className="hint">Supports up to {MAX_SYMBOLS} symbols for comparison. First symbol becomes the primary candle.</p>
        </div>

        <div className="control-row">
          <div className="control-group">
            <label htmlFor="interval">Interval</label>
            <select
              id="interval"
              className="select-input"
              value={interval}
              onChange={(event) => setInterval(event.target.value)}
            >
              <option value="1d">1 Day</option>
              <option value="4h">4 Hours</option>
              <option value="1h">1 Hour</option>
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="range">Range</label>
            <select id="range" className="select-input" value={range} onChange={(event) => setRange(event.target.value)}>
              <option value="1M">1 Month</option>
              <option value="3M">3 Months</option>
              <option value="6M">6 Months</option>
              <option value="1Y">1 Year</option>
              <option value="ytd">Year-to-date</option>
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="view">Visualization</label>
            <div className="segmented">
              <button
                type="button"
                className={view === 'candles' ? 'segment active' : 'segment'}
                onClick={() => setView('candles')}
              >
                Candlestick
              </button>
              <button
                type="button"
                className={view === 'line' ? 'segment active' : 'segment'}
                onClick={() => setView('line')}
              >
                Line
              </button>
            </div>
          </div>

          <div className="control-group toggles">
            <label>Overlays</label>
            <div className="toggle-row">
              <label className="checkbox">
                <input type="checkbox" checked={overlays.sma} onChange={() => toggleOverlay('sma')} /> SMA (20)
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={overlays.ema} onChange={() => toggleOverlay('ema')} /> EMA (20)
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={overlays.volume} onChange={() => toggleOverlay('volume')} /> Volume
              </label>
            </div>
          </div>
        </div>

        <div className="control-actions">
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Loading…' : 'Apply filters'}
          </button>
          <p className="status-text">{statusMessage}</p>
        </div>
      </form>

      <div className="chip-row" aria-live="polite">
        {selectedSymbols.map((symbol) => (
          <span key={symbol} className={`chip ${symbol === primarySymbol ? 'chip-primary' : ''}`}>
            {symbol}
            {symbol === primarySymbol ? ' • primary' : ''}
          </span>
        ))}
        {!selectedSymbols.length ? <span className="chip">No symbols selected</span> : null}
      </div>

      {error ? (
        <div className="callout callout-error" role="alert">
          <p className="callout-title">Unable to load OHLCV data</p>
          <p>{error.message}</p>
        </div>
      ) : null}

      {!error && !chart.rows.length && !loading ? (
        <div className="placeholder-card" role="status">
          <p>No data available for the selected parameters.</p>
        </div>
      ) : null}

      <div className="chart-card">
        <div className="chart-header">
          <div>
            <p className="chart-kicker">{view === 'candles' ? 'Candlesticks + overlays' : 'Line chart with comparisons'}</p>
            <h2 className="chart-title">{primarySymbol ?? 'Waiting for symbol selection'}</h2>
          </div>
          {showComparison ? <span className="badge">Comparison mode</span> : null}
        </div>

        <div className="chart-body" role="img" aria-label="OHLCV chart visualization">
          {loading ? (
            <div className="chart-loading" aria-live="polite">
              <div className="global-loading-spinner" aria-hidden="true" />
              <p>Loading price and volume data…</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={420}>
              <ComposedChart data={chart.rows} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="timestamp" tickFormatter={(value) => formatDateLabel(value)} />
                <YAxis yAxisId="price" domain={['auto', 'auto']} allowDataOverflow tickFormatter={(value) => `$${value}`} />
                {overlays.volume ? (
                  <YAxis yAxisId="volume" orientation="right" width={60} tickFormatter={(value) => `${Math.round(value / 1_000_000)}M`} />
                ) : null}
                <Tooltip content={<ChartTooltip />} />
                <Legend />

                {view === 'candles' && primarySymbol ? (
                  <Customized component={<CandlestickLayer primarySymbol={primarySymbol} />} />
                ) : null}

                {overlays.volume ? (
                  <Bar
                    name={primarySymbol ? `${primarySymbol} Volume` : 'Volume'}
                    yAxisId="volume"
                    dataKey="volume"
                    fill="#cbd5e1"
                    opacity={0.7}
                    maxBarSize={16}
                  />
                ) : null}

                {view === 'line' ? (
                  selectedSymbols.map((symbol, index) => (
                    <Line
                      key={symbol}
                      name={`${symbol} Close`}
                      type="monotone"
                      yAxisId="price"
                      dataKey={`close-${symbol}`}
                      stroke={LINE_COLORS[index % LINE_COLORS.length]}
                      dot={false}
                      strokeWidth={2}
                    />
                  ))
                ) : primarySymbol ? (
                  <Line
                    name={`${primarySymbol} Close`}
                    type="monotone"
                    yAxisId="price"
                    dataKey={`close-${primarySymbol}`}
                    stroke="#0f172a"
                    dot={false}
                    strokeWidth={2}
                  />
                ) : null}

                {showComparison && view === 'line'
                  ? selectedSymbols.map((symbol, index) => (
                      <Line
                        key={`${symbol}-normalized`}
                        name={`${symbol} Normalized`}
                        type="monotone"
                        yAxisId="price"
                        dataKey={`normalized-${symbol}`}
                        stroke={LINE_COLORS[(index + 2) % LINE_COLORS.length]}
                        dot={false}
                        strokeDasharray="4 2"
                      />
                    ))
                  : null}

                {overlays.sma ? (
                  <Line name="SMA (20)" type="monotone" yAxisId="price" dataKey="sma" stroke="#22c55e" dot={false} />
                ) : null}
                {overlays.ema ? (
                  <Line name="EMA (20)" type="monotone" yAxisId="price" dataKey="ema" stroke="#8b5cf6" dot={false} />
                ) : null}

                {primarySymbol && view === 'candles' ? (
                  <Area
                    yAxisId="price"
                    type="monotone"
                    dataKey={`high-${primarySymbol}`}
                    stroke="none"
                    fill="#e0f2fe"
                    fillOpacity={0.3}
                    isAnimationActive={false}
                  />
                ) : null}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}

export default OhlcvExplorer;
