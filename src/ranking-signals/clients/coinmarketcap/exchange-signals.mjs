import { createHttpClient } from '../shared/http-client.mjs';
import { buildCoinMarketCapHeaders } from './api-key.mjs';

const BASE_URL = 'https://pro-api.coinmarketcap.com';
const EXCHANGE_QUOTES_ENDPOINT = 'v1/exchange/quotes/latest';

let coinMarketCapClient;

function getCoinMarketCapClient() {
    if (!coinMarketCapClient) {
        coinMarketCapClient = createHttpClient({
            baseUrl: BASE_URL,
            headers: buildCoinMarketCapHeaders(),
            timeout: 10000
        });
    }

    return coinMarketCapClient;
}

function coerceNumber(value) {
    if (value === undefined || value === null) {
        return undefined;
    }

    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : undefined;
}

function getFirstExchangeRecord(payload) {
    if (!payload || typeof payload !== 'object') {
        return undefined;
    }

    if (payload.id) {
        return payload;
    }

    if (payload.data && typeof payload.data === 'object') {
        const values = Object.values(payload.data);
        return values.length > 0 ? values[0] : undefined;
    }

    return undefined;
}

export function mapCoinMarketCapExchangeSignals({
    exchangeCode,
    slug,
    convert = 'USD',
    observedAt = new Date(),
    payload
}) {
    const exchangeRecord = getFirstExchangeRecord(payload);

    if (!exchangeRecord) {
        return [];
    }

    const quote = exchangeRecord.quote?.[convert];
    const quoteTimestamp = quote?.last_updated ?? exchangeRecord.last_updated;
    const observedTimestamp = quoteTimestamp ? new Date(quoteTimestamp) : observedAt;

    const metadata = {
        id: exchangeRecord.id,
        slug: exchangeRecord.slug ?? slug,
        name: exchangeRecord.name,
        numMarketPairs: exchangeRecord.num_market_pairs,
        exchangeScore: exchangeRecord.exchange_score,
        liquidityScore: exchangeRecord.liquidity_score,
        spotVolumeUSD: quote?.volume_24h,
        spotVolumeUSD7d: quote?.volume_7d,
        spotVolumeUSD30d: quote?.volume_30d
    };

    const metrics = [];

    const volume24h = coerceNumber(quote?.volume_24h);
    if (volume24h !== undefined) {
        metrics.push({
            exchangeCode,
            metricKey: 'coinmarketcap.volume_24h_usd',
            metricValue: volume24h,
            metricText: `CoinMarketCap reported 24h volume in ${convert}.`,
            weight: 0.3,
            source: 'coinmarketcap',
            observedAt: observedTimestamp,
            metadata
        });
    }

    const volume30d = coerceNumber(quote?.volume_30d);
    if (volume30d !== undefined) {
        metrics.push({
            exchangeCode,
            metricKey: 'coinmarketcap.volume_30d_usd',
            metricValue: volume30d,
            metricText: `CoinMarketCap reported 30d volume in ${convert}.`,
            weight: 0.2,
            source: 'coinmarketcap',
            observedAt: observedTimestamp,
            metadata
        });
    }

    const markets = coerceNumber(exchangeRecord.num_market_pairs);
    if (markets !== undefined) {
        metrics.push({
            exchangeCode,
            metricKey: 'coinmarketcap.market_pairs',
            metricValue: markets,
            metricText: 'Number of market pairs tracked by CoinMarketCap for this exchange.',
            weight: 0.1,
            source: 'coinmarketcap',
            observedAt: observedTimestamp,
            metadata
        });
    }

    const liquidityScore = coerceNumber(exchangeRecord.liquidity_score ?? exchangeRecord.exchange_score);
    if (liquidityScore !== undefined) {
        metrics.push({
            exchangeCode,
            metricKey: 'coinmarketcap.liquidity_score',
            metricValue: liquidityScore,
            metricText: 'CoinMarketCap liquidity or exchange score.',
            weight: 0.15,
            source: 'coinmarketcap',
            observedAt: observedTimestamp,
            metadata
        });
    }

    return metrics;
}

export async function fetchCoinMarketCapExchangeSignals({
    exchangeCode = 'BINANCE',
    slug = 'binance',
    convert = 'USD',
    observedAt = new Date(),
    signal
} = {}) {
    const response = await getCoinMarketCapClient().get(EXCHANGE_QUOTES_ENDPOINT, {
        responseType: 'json',
        searchParams: {
            slug,
            convert
        },
        signal
    });

    return mapCoinMarketCapExchangeSignals({
        exchangeCode,
        slug,
        convert,
        observedAt,
        payload: response.body
    });
}
