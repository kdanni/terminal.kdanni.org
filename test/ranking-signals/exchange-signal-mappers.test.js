import test from 'node:test';
import assert from 'node:assert/strict';

import { mapBinanceExchangeSignals } from '../../src/ranking-signals/clients/binance/exchange-signals.mjs';
import { mapCoinGeckoExchangeSignals } from '../../src/ranking-signals/clients/coingecko/exchange-signals.mjs';
import { mapCoinMarketCapExchangeSignals } from '../../src/ranking-signals/clients/coinmarketcap/exchange-signals.mjs';

const OBSERVED_AT = new Date('2024-01-01T00:00:00Z');

test('mapCoinGeckoExchangeSignals extracts core trust and volume metrics', () => {
    const payload = {
        id: 'binance',
        name: 'Binance',
        country: 'Cayman Islands',
        url: 'https://www.binance.com/',
        year_established: 2017,
        centralized: true,
        has_trading_incentive: false,
        trust_score: 10,
        trust_score_rank: 1,
        trade_volume_24h_btc: '560000.123',
        trade_volume_24h_btc_normalized: '540000.789',
        tickers: new Array(1250).fill({})
    };

    const metrics = mapCoinGeckoExchangeSignals({
        exchangeCode: 'BINANCE',
        exchangeId: 'binance',
        observedAt: OBSERVED_AT,
        payload
    });

    assert.equal(metrics.length, 5);
    const trustScoreMetric = metrics.find(metric => metric.metricKey === 'coingecko.trust_score');
    assert.ok(trustScoreMetric);
    assert.equal(trustScoreMetric.metricValue, 10);
    assert.equal(trustScoreMetric.weight, 0.15);

    const volumeMetric = metrics.find(metric => metric.metricKey === 'coingecko.trade_volume_24h_btc');
    assert.ok(volumeMetric);
    assert.equal(volumeMetric.metricValue, 560000.123);

    const tickersMetric = metrics.find(metric => metric.metricKey === 'coingecko.listed_pairs');
    assert.ok(tickersMetric);
    assert.equal(tickersMetric.metricValue, 1250);
    assert.deepEqual(tickersMetric.metadata.id, 'binance');
});

test('mapCoinMarketCapExchangeSignals extracts volume and market coverage data', () => {
    const payload = {
        data: {
            270: {
                id: 270,
                name: 'Binance',
                slug: 'binance',
                num_market_pairs: 1750,
                liquidity_score: 823.23,
                quote: {
                    USD: {
                        volume_24h: 25000000000,
                        volume_30d: 725000000000,
                        last_updated: '2024-02-01T12:00:00Z'
                    }
                }
            }
        }
    };

    const metrics = mapCoinMarketCapExchangeSignals({
        exchangeCode: 'BINANCE',
        slug: 'binance',
        convert: 'USD',
        observedAt: OBSERVED_AT,
        payload
    });

    assert.equal(metrics.length, 4);
    const volume24 = metrics.find(metric => metric.metricKey === 'coinmarketcap.volume_24h_usd');
    assert.equal(volume24.metricValue, 25000000000);
    assert.equal(volume24.observedAt.toISOString(), '2024-02-01T12:00:00.000Z');

    const marketPairs = metrics.find(metric => metric.metricKey === 'coinmarketcap.market_pairs');
    assert.equal(marketPairs.metricValue, 1750);
    assert.equal(marketPairs.source, 'coinmarketcap');
});

test('mapBinanceExchangeSignals summarizes listings breadth', () => {
    const payload = {
        timezone: 'UTC',
        serverTime: 1704067200000,
        symbols: [
            { symbol: 'BTCUSDT', status: 'TRADING', baseAsset: 'BTC', quoteAsset: 'USDT', isSpotTradingAllowed: true, isMarginTradingAllowed: true },
            { symbol: 'ETHUSDT', status: 'TRADING', baseAsset: 'ETH', quoteAsset: 'USDT', isSpotTradingAllowed: true, isMarginTradingAllowed: true },
            { symbol: 'BNBUSDT', status: 'TRADING', baseAsset: 'BNB', quoteAsset: 'USDT', isSpotTradingAllowed: true, isMarginTradingAllowed: false },
            { symbol: 'ABCUSDT', status: 'BREAK', baseAsset: 'ABC', quoteAsset: 'USDT', isSpotTradingAllowed: false },
            { symbol: 'SOLBTC', status: 'TRADING', baseAsset: 'SOL', quoteAsset: 'BTC', isSpotTradingAllowed: true, isMarginTradingAllowed: false }
        ]
    };

    const metrics = mapBinanceExchangeSignals({
        exchangeCode: 'BINANCE',
        observedAt: OBSERVED_AT,
        payload
    });

    const spotPairs = metrics.find(metric => metric.metricKey === 'binance.spot_pairs_active');
    assert.equal(spotPairs.metricValue, 4);

    const marginPairs = metrics.find(metric => metric.metricKey === 'binance.margin_pairs_active');
    assert.equal(marginPairs.metricValue, 2);

    const quoteAssets = metrics.find(metric => metric.metricKey === 'binance.unique_quote_assets');
    assert.equal(quoteAssets.metricValue, 2);

    assert.ok(metrics.every(metric => metric.observedAt instanceof Date));
});
