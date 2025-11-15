import { createHttpClient } from '../shared/http-client.mjs';
import { buildBinanceHeaders } from './api-key.mjs';

const BASE_URL = 'https://api.binance.com';
const EXCHANGE_INFO_ENDPOINT = 'api/v3/exchangeInfo';

let binanceClient;

function getBinanceClient() {
    if (!binanceClient) {
        binanceClient = createHttpClient({
            baseUrl: BASE_URL,
            headers: buildBinanceHeaders(),
            timeout: 10000
        });
    }

    return binanceClient;
}

function coerceNumber(value) {
    if (value === undefined || value === null) {
        return undefined;
    }

    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : undefined;
}

function countUnique(values) {
    return new Set(values).size;
}

export function mapBinanceExchangeSignals({ exchangeCode, observedAt = new Date(), payload }) {
    if (!payload || typeof payload !== 'object') {
        return [];
    }

    const symbols = Array.isArray(payload.symbols) ? payload.symbols : [];
    const tradingSymbols = symbols.filter(symbol => symbol?.status === 'TRADING');
    const spotSymbols = tradingSymbols.filter(symbol => symbol?.isSpotTradingAllowed);
    const marginSymbols = tradingSymbols.filter(symbol => symbol?.isMarginTradingAllowed);

    const observedTimestamp = payload.serverTime
        ? new Date(payload.serverTime)
        : observedAt;

    const metadata = {
        timezone: payload.timezone,
        serverTime: payload.serverTime,
        rateLimitCount: Array.isArray(payload.rateLimits) ? payload.rateLimits.length : undefined,
        exchangeFilterCount: Array.isArray(payload.exchangeFilters) ? payload.exchangeFilters.length : undefined
    };

    const metrics = [];

    metrics.push({
        exchangeCode,
        metricKey: 'binance.total_symbols_reported',
        metricValue: coerceNumber(symbols.length),
        metricText: 'Total symbols returned by Binance exchangeInfo endpoint.',
        weight: 0.05,
        source: 'binance',
        observedAt: observedTimestamp,
        metadata
    });

    metrics.push({
        exchangeCode,
        metricKey: 'binance.spot_pairs_active',
        metricValue: coerceNumber(spotSymbols.length),
        metricText: 'Active spot trading pairs reported by Binance.',
        weight: 0.2,
        source: 'binance',
        observedAt: observedTimestamp,
        metadata
    });

    metrics.push({
        exchangeCode,
        metricKey: 'binance.margin_pairs_active',
        metricValue: coerceNumber(marginSymbols.length),
        metricText: 'Active margin trading pairs reported by Binance.',
        weight: 0.05,
        source: 'binance',
        observedAt: observedTimestamp,
        metadata
    });

    metrics.push({
        exchangeCode,
        metricKey: 'binance.unique_quote_assets',
        metricValue: coerceNumber(countUnique(spotSymbols.map(symbol => symbol.quoteAsset))),
        metricText: 'Unique quote assets across Binance spot pairs.',
        weight: 0.1,
        source: 'binance',
        observedAt: observedTimestamp,
        metadata
    });

    metrics.push({
        exchangeCode,
        metricKey: 'binance.unique_base_assets',
        metricValue: coerceNumber(countUnique(spotSymbols.map(symbol => symbol.baseAsset))),
        metricText: 'Unique base assets across Binance spot pairs.',
        weight: 0.1,
        source: 'binance',
        observedAt: observedTimestamp,
        metadata
    });

    return metrics.filter(metric => metric.metricValue !== undefined);
}

export async function fetchBinanceExchangeSignals({ exchangeCode = 'BINANCE', observedAt = new Date(), signal } = {}) {
    const response = await getBinanceClient().get(EXCHANGE_INFO_ENDPOINT, {
        responseType: 'json',
        signal
    });

    return mapBinanceExchangeSignals({
        exchangeCode,
        observedAt,
        payload: response.body
    });
}
