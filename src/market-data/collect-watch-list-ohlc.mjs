import { listActiveAssetWatchListEntries } from '../postgres/asset-watch-list.mjs';
import { upsertOhlcvSeries } from '../postgres/ohlcv-data.mjs';
import { getOhlcProviders } from './providers/registry.mjs';

function sanitizeSymbol(symbol) {
    return String(symbol ?? '').trim();
}

function sanitizeExchange(exchange) {
    if (exchange == null) {
        return null;
    }

    const trimmed = String(exchange).trim();
    return trimmed.length === 0 ? null : trimmed;
}

async function fetchWithFallback({ symbol, exchange, interval, lookback }) {
    const providers = getOhlcProviders();

    for (const provider of providers) {
        try {
            const bars = await provider.fetchOhlc({ symbol, exchange, interval, lookback });

            if (Array.isArray(bars) && bars.length > 0) {
                console.info(`[ohlc] ${provider.name} returned ${bars.length} bars for ${symbol} (${exchange ?? 'GLOBAL'}) ${interval}`);
                return bars;
            }

            console.warn(`[ohlc] ${provider.name} returned no data for ${symbol} (${exchange ?? 'GLOBAL'}) ${interval}`);
        } catch (error) {
            console.warn(`[ohlc] ${provider.name} request failed for ${symbol} (${exchange ?? 'GLOBAL'}) ${interval}: ${error.message}`);
        }
    }

    return [];
}

export async function collectWatchListOhlc({ interval = '1d', lookback = 30 } = {}) {
    const normalizedInterval = String(interval ?? '1d').trim();
    const parsedLookback = Number(lookback);
    const normalizedLookback = Number.isFinite(parsedLookback) ? Math.max(1, Math.round(parsedLookback)) : 30;

    console.info(`[ohlc] Collecting ${normalizedInterval} OHLC data for active watch list assets (lookback=${normalizedLookback})`);

    const watchList = await listActiveAssetWatchListEntries();
    console.info(`[ohlc] Found ${watchList.length} active watch list entries`);

    for (const entry of watchList) {
        const symbol = sanitizeSymbol(entry.symbol);
        const exchange = sanitizeExchange(entry.exchange);

        if (!symbol) {
            console.warn('[ohlc] Skipping entry without a symbol');
            continue;
        }

        const bars = await fetchWithFallback({ symbol, exchange, interval: normalizedInterval, lookback: normalizedLookback });
        if (bars.length === 0) {
            console.warn(`[ohlc] No providers returned data for ${symbol} (${exchange ?? 'GLOBAL'})`);
            continue;
        }

        try {
            await upsertOhlcvSeries(bars);
            console.info(`[ohlc] Upserted ${bars.length} bars for ${symbol} (${exchange ?? 'GLOBAL'})`);
        } catch (error) {
            console.error(`[ohlc] Failed to upsert data for ${symbol} (${exchange ?? 'GLOBAL'}): ${error.message}`);
        }
    }

    console.info('[ohlc] Collection process completed');
}
