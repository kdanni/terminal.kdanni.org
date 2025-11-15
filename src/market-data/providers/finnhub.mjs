import got from 'got';

import { withFinnhubApiKey } from '../../finnhub/api-key.mjs';

const INTERVAL_MAP = new Map([
    ['1d', 'D'],
    ['1day', 'D'],
    ['1h', '60'],
    ['60min', '60'],
    ['1m', '1'],
]);

function normalizeInterval(interval) {
    const mapped = INTERVAL_MAP.get(interval);
    if (!mapped) {
        throw new Error(`Finnhub does not support interval ${interval}`);
    }

    return mapped;
}

function toDate(epochSeconds) {
    const millis = Number(epochSeconds) * 1000;
    if (!Number.isFinite(millis)) {
        return null;
    }

    const time = new Date(millis);
    return Number.isNaN(time.valueOf()) ? null : time;
}

export async function fetchFinnhubOhlc({ symbol, exchange, interval, lookback }) {
    const resolution = normalizeInterval(interval);

    const params = {
        symbol,
        resolution,
        count: lookback,
    };

    const url = withFinnhubApiKey('https://finnhub.io/api/v1/stock/candle', params);
    const response = await got(url, { timeout: { request: 10000 } });
    const payload = JSON.parse(response.body);

    if (payload.s === 'no_data') {
        return [];
    }

    if (payload.s !== 'ok') {
        throw new Error(`Finnhub error response: ${payload.s}`);
    }

    const timestamps = payload.t ?? [];
    const opens = payload.o ?? [];
    const highs = payload.h ?? [];
    const lows = payload.l ?? [];
    const closes = payload.c ?? [];
    const volumes = payload.v ?? [];

    const bars = [];
    for (let i = 0; i < timestamps.length; i++) {
        const time = toDate(timestamps[i]);
        const open = Number(opens[i]);
        const high = Number(highs[i]);
        const low = Number(lows[i]);
        const close = Number(closes[i]);
        const volume = Number(volumes[i]);

        if (!time || ![open, high, low, close].every(Number.isFinite)) {
            continue;
        }

        bars.push({
            provider: 'finnhub',
            symbol,
            exchange,
            interval,
            time,
            open,
            high,
            low,
            close,
            volume: Number.isFinite(volume) && volume >= 0 ? Math.round(volume) : 0,
        });
    }

    return bars.sort((a, b) => a.time.valueOf() - b.time.valueOf());
}

export function createFinnhubProvider() {
    return {
        name: 'finnhub',
        fetchOhlc: fetchFinnhubOhlc,
    };
}
