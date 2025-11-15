import got from 'got';

import { withAlphaVantageApiKey } from '../../alpha-vantage/api-key.mjs';

const INTERVAL_CONFIG = new Map([
    ['1d', { function: 'TIME_SERIES_DAILY_ADJUSTED', seriesKey: 'Time Series (Daily)' }],
    ['1day', { function: 'TIME_SERIES_DAILY_ADJUSTED', seriesKey: 'Time Series (Daily)' }],
    ['1h', { function: 'TIME_SERIES_INTRADAY', seriesKey: 'Time Series (60min)', params: { interval: '60min' } }],
    ['60min', { function: 'TIME_SERIES_INTRADAY', seriesKey: 'Time Series (60min)', params: { interval: '60min' } }],
    ['1m', { function: 'TIME_SERIES_INTRADAY', seriesKey: 'Time Series (1min)', params: { interval: '1min' } }],
]);

function parseTimestamp(raw) {
    if (typeof raw !== 'string') {
        return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return new Date(`${raw}T00:00:00Z`);
    }

    return new Date(`${raw}Z`);
}

function parseSeries(series, { symbol, exchange, interval }) {
    return Object.entries(series)
        .map(([timestamp, values]) => ({
            provider: 'alpha-vantage',
            symbol,
            exchange,
            interval,
            time: parseTimestamp(timestamp),
            open: Number(values['1. open']),
            high: Number(values['2. high']),
            low: Number(values['3. low']),
            close: Number(values['4. close']),
            volume: Number(values['5. volume'] ?? values['6. volume'] ?? 0),
        }))
        .filter(bar => bar.time instanceof Date && !Number.isNaN(bar.time.valueOf()))
        .filter(bar => [bar.open, bar.high, bar.low, bar.close].every(Number.isFinite))
        .sort((a, b) => a.time.valueOf() - b.time.valueOf());
}

function buildRequestUrl({ symbol, functionName, params = {}, lookback }) {
    const requestParams = {
        function: functionName,
        symbol,
        outputsize: lookback && lookback > 100 ? 'full' : 'compact',
        datatype: 'json',
        ...params,
    };

    return withAlphaVantageApiKey('https://www.alphavantage.co/query', requestParams);
}

export async function fetchAlphaVantageOhlc({ symbol, exchange, interval, lookback }) {
    const config = INTERVAL_CONFIG.get(interval);

    if (!config) {
        throw new Error(`Alpha Vantage does not support interval ${interval}`);
    }

    const url = buildRequestUrl({
        symbol,
        functionName: config.function,
        params: config.params,
        lookback,
    });

    const response = await got(url, { timeout: { request: 10000 } });
    const payload = JSON.parse(response.body);

    if (payload.Note) {
        throw new Error(`Alpha Vantage throttling: ${payload.Note}`);
    }

    if (payload['Error Message']) {
        throw new Error(payload['Error Message']);
    }

    const series = payload[config.seriesKey];
    if (!series || typeof series !== 'object') {
        return [];
    }

    return parseSeries(series, { symbol, exchange, interval });
}

export function createAlphaVantageProvider() {
    return {
        name: 'alpha-vantage',
        fetchOhlc: fetchAlphaVantageOhlc,
    };
}
