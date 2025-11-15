import got from 'got';

import { withTwelveDataApiKey } from '../../twelve-data/api-key.mjs';

const INTERVAL_MAP = new Map([
    ['1d', '1day'],
    ['1day', '1day'],
    ['1h', '1h'],
    ['1m', '1min'],
]);

function normalizeInterval(interval) {
    const normalized = INTERVAL_MAP.get(interval);
    return normalized ?? interval;
}

function toNumber(value) {
    if (value == null) {
        return null;
    }

    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

function toVolume(value) {
    const volume = Number(value);
    if (Number.isFinite(volume) && volume >= 0) {
        return Math.round(volume);
    }

    return 0;
}

function parseTimestamp(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    const isoLike = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
    const candidate = isoLike.endsWith('Z') ? isoLike : `${isoLike}Z`;
    const time = new Date(candidate);
    return Number.isNaN(time.valueOf()) ? null : time;
}

function parseBars(values = [], options) {
    return values
        .map(entry => ({
            provider: 'twelve-data',
            symbol: options.symbol,
            exchange: options.exchange,
            interval: options.interval,
            time: parseTimestamp(entry.datetime),
            open: toNumber(entry.open),
            high: toNumber(entry.high),
            low: toNumber(entry.low),
            close: toNumber(entry.close),
            volume: toVolume(entry.volume),
        }))
        .filter(bar => bar.time instanceof Date && !Number.isNaN(bar.time.valueOf()))
        .filter(bar => [bar.open, bar.high, bar.low, bar.close].every(Number.isFinite));
}

export async function fetchTwelveDataOhlc({ symbol, exchange, interval, lookback }) {
    const normalizedInterval = normalizeInterval(interval);
    const params = {
        symbol,
        interval: normalizedInterval,
        outputsize: lookback,
        order: 'ASC',
    };

    if (exchange) {
        params.exchange = exchange;
    }

    const url = withTwelveDataApiKey('https://api.twelvedata.com/time_series', params);
    const response = await got(url, { timeout: { request: 10000 } });
    const payload = JSON.parse(response.body);

    if (payload.status === 'error') {
        const message = payload.message ?? 'Unknown Twelve Data API error';
        throw new Error(`Twelve Data error: ${message}`);
    }

    if (!Array.isArray(payload.values)) {
        return [];
    }

    return parseBars(payload.values, { symbol, exchange, interval });
}

export function createTwelveDataProvider() {
    return {
        name: 'twelve-data',
        fetchOhlc: fetchTwelveDataOhlc,
    };
}
