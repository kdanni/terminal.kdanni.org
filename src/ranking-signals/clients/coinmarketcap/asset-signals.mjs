import { createHttpClient } from '../shared/http-client.mjs';
import { buildCoinMarketCapHeaders } from './api-key.mjs';

const BASE_URL = 'https://pro-api.coinmarketcap.com';
const CRYPTO_QUOTES_ENDPOINT = 'v2/cryptocurrency/quotes/latest';

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

function getFirstAssetRecord(payload) {
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

export function mapCoinMarketCapAssetSignals({
    assetSymbol,
    assetType = 'cryptocurrency',
    slug,
    convert = 'USD',
    observedAt = new Date(),
    payload
}) {
    const normalizedConvert = String(convert ?? 'USD').toUpperCase();
    const assetRecord = getFirstAssetRecord(payload);

    if (!assetRecord) {
        return [];
    }

    const quote = assetRecord.quote?.[normalizedConvert];
    const quoteTimestamp = quote?.last_updated ?? assetRecord.last_updated;
    const observedTimestamp = quoteTimestamp ? new Date(quoteTimestamp) : observedAt;
    const currencyKey = normalizedConvert.toLowerCase();

    const metadata = {
        id: assetRecord.id,
        slug: assetRecord.slug ?? slug,
        name: assetRecord.name,
        cmcRank: assetRecord.cmc_rank,
        circulatingSupply: assetRecord.circulating_supply,
        totalSupply: assetRecord.total_supply,
        maxSupply: assetRecord.max_supply
    };

    const signals = [];

    const price = coerceNumber(quote?.price);
    if (price !== undefined) {
        signals.push({
            assetSymbol,
            assetType,
            metricKey: `coinmarketcap.price_${currencyKey}`,
            metricValue: price,
            metricText: `CoinMarketCap price in ${normalizedConvert}.`,
            weight: 0.3,
            source: 'coinmarketcap',
            observedAt: observedTimestamp,
            metadata
        });
    }

    const marketCap = coerceNumber(quote?.market_cap);
    if (marketCap !== undefined) {
        signals.push({
            assetSymbol,
            assetType,
            metricKey: `coinmarketcap.market_cap_${currencyKey}`,
            metricValue: marketCap,
            metricText: `CoinMarketCap market cap in ${normalizedConvert}.`,
            weight: 0.25,
            source: 'coinmarketcap',
            observedAt: observedTimestamp,
            metadata
        });
    }

    const volume24h = coerceNumber(quote?.volume_24h);
    if (volume24h !== undefined) {
        signals.push({
            assetSymbol,
            assetType,
            metricKey: `coinmarketcap.volume_24h_${currencyKey}`,
            metricValue: volume24h,
            metricText: `CoinMarketCap reported 24h volume in ${normalizedConvert}.`,
            weight: 0.2,
            source: 'coinmarketcap',
            observedAt: observedTimestamp,
            metadata
        });
    }

    const dominance = coerceNumber(quote?.market_cap_dominance);
    if (dominance !== undefined) {
        signals.push({
            assetSymbol,
            assetType,
            metricKey: 'coinmarketcap.market_cap_dominance',
            metricValue: dominance,
            metricText: 'CoinMarketCap market cap dominance percentage.',
            weight: 0.1,
            source: 'coinmarketcap',
            observedAt: observedTimestamp,
            metadata
        });
    }

    const cmcRank = coerceNumber(assetRecord.cmc_rank);
    if (cmcRank !== undefined) {
        signals.push({
            assetSymbol,
            assetType,
            metricKey: 'coinmarketcap.rank',
            metricValue: cmcRank,
            metricText: 'CoinMarketCap overall rank.',
            weight: 0.15,
            source: 'coinmarketcap',
            observedAt: observedTimestamp,
            metadata
        });
    }

    return signals;
}

export async function fetchCoinMarketCapAssetSignals({
    assetSymbol,
    slug,
    convert = 'USD',
    observedAt = new Date(),
    signal
} = {}) {
    const normalizedConvert = String(convert ?? 'USD').toUpperCase();
    const response = await getCoinMarketCapClient().get(CRYPTO_QUOTES_ENDPOINT, {
        responseType: 'json',
        searchParams: {
            slug,
            convert: normalizedConvert
        },
        signal
    });

    return mapCoinMarketCapAssetSignals({
        assetSymbol,
        slug,
        convert: normalizedConvert,
        observedAt,
        payload: response.body
    });
}
