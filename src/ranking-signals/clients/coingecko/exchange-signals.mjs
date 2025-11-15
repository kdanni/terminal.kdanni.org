import { createHttpClient } from '../shared/http-client.mjs';
import { buildCoinGeckoHeaders } from './api-key.mjs';

const BASE_URL = 'https://api.coingecko.com/api/v3';

let coinGeckoClient;

function getCoinGeckoClient() {
    if (!coinGeckoClient) {
        coinGeckoClient = createHttpClient({
            baseUrl: BASE_URL,
            headers: buildCoinGeckoHeaders(),
            timeout: 10000
        });
    }

    return coinGeckoClient;
}

function coerceNumber(value) {
    if (value === undefined || value === null) {
        return undefined;
    }

    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : undefined;
}

export function mapCoinGeckoExchangeSignals({ exchangeCode, exchangeId, observedAt = new Date(), payload }) {
    if (!payload || typeof payload !== 'object') {
        return [];
    }

    const metadata = {
        id: payload.id ?? exchangeId,
        name: payload.name,
        country: payload.country,
        url: payload.url,
        yearEstablished: payload.year_established,
        centralized: payload.centralized,
        hasTradingIncentive: payload.has_trading_incentive
    };

    const tickers = Array.isArray(payload.tickers) ? payload.tickers : [];
    const observedTimestamp = observedAt;

    const metrics = [];

    const trustScore = coerceNumber(payload.trust_score);
    if (trustScore !== undefined) {
        metrics.push({
            exchangeCode,
            metricKey: 'coingecko.trust_score',
            metricValue: trustScore,
            metricText: 'CoinGecko trust score (0-10 scale).',
            weight: 0.15,
            source: 'coingecko',
            observedAt: observedTimestamp,
            metadata
        });
    }

    const trustScoreRank = coerceNumber(payload.trust_score_rank);
    if (trustScoreRank !== undefined) {
        metrics.push({
            exchangeCode,
            metricKey: 'coingecko.trust_score_rank',
            metricValue: trustScoreRank,
            metricText: 'CoinGecko trust score rank (1 = highest).',
            weight: 0.05,
            source: 'coingecko',
            observedAt: observedTimestamp,
            metadata
        });
    }

    const rawVolume = coerceNumber(payload.trade_volume_24h_btc);
    if (rawVolume !== undefined) {
        metrics.push({
            exchangeCode,
            metricKey: 'coingecko.trade_volume_24h_btc',
            metricValue: rawVolume,
            metricText: 'Reported 24h trade volume in BTC.',
            weight: 0.25,
            source: 'coingecko',
            observedAt: observedTimestamp,
            metadata
        });
    }

    const normalizedVolume = coerceNumber(payload.trade_volume_24h_btc_normalized);
    if (normalizedVolume !== undefined) {
        metrics.push({
            exchangeCode,
            metricKey: 'coingecko.trade_volume_24h_btc_normalized',
            metricValue: normalizedVolume,
            metricText: 'Normalized 24h trade volume in BTC (wash trading adjusted).',
            weight: 0.25,
            source: 'coingecko',
            observedAt: observedTimestamp,
            metadata
        });
    }

    metrics.push({
        exchangeCode,
        metricKey: 'coingecko.listed_pairs',
        metricValue: coerceNumber(tickers.length),
        metricText: 'Number of tickers returned by CoinGecko exchange endpoint.',
        weight: 0.1,
        source: 'coingecko',
        observedAt: observedTimestamp,
        metadata
    });

    return metrics.filter(metric => metric.metricValue !== undefined);
}

export async function fetchCoinGeckoExchangeSignals({
    exchangeCode = 'BINANCE',
    exchangeId = 'binance',
    observedAt = new Date(),
    signal
} = {}) {
    const response = await getCoinGeckoClient().get(`exchanges/${exchangeId}`, {
        responseType: 'json',
        signal
    });

    return mapCoinGeckoExchangeSignals({
        exchangeCode,
        exchangeId,
        observedAt,
        payload: response.body
    });
}
