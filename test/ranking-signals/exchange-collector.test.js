import test from 'node:test';
import assert from 'node:assert/strict';

import { collectExchangeRankingSignals, extractRunIdFromResult } from '../../src/ranking-signals/collect-exchange-signals.mjs';

class StubConnection {
    constructor() {
        this.calls = [];
        this.closed = false;
    }

    async query(sql, params) {
        this.calls.push({ sql, params });
        if (sql.includes('upsert_ranking_run')) {
            return [[[{ run_id: 42 }]], []];
        }
        return [[], []];
    }

    async end() {
        this.closed = true;
    }
}

test('extractRunIdFromResult reads nested row sets', () => {
    const runId = extractRunIdFromResult([[[{ run_id: 7 }]]]);
    assert.equal(runId, 7);
    assert.equal(extractRunIdFromResult([{ run_id: '9' }]), 9);
    assert.equal(extractRunIdFromResult(null), undefined);
});

test('collectExchangeRankingSignals persists metrics returned by fetchers', async () => {
    const connection = new StubConnection();
    const signal = {
        exchangeCode: 'BINANCE',
        metricKey: 'test.metric',
        metricValue: 123,
        metricText: 'Test metric',
        weight: 0.1,
        source: 'unit-test',
        observedAt: new Date('2024-03-01T00:00:00Z'),
        metadata: { foo: 'bar' }
    };

    const fetchCallArgs = [];

    const fetchers = {
        binance: async options => {
            fetchCallArgs.push({ service: 'binance', options });
            return [signal];
        },
        coingecko: async options => {
            fetchCallArgs.push({ service: 'coingecko', options });
            return [];
        },
        coinmarketcap: async options => {
            fetchCallArgs.push({ service: 'coinmarketcap', options });
            return [];
        }
    };

    const result = await collectExchangeRankingSignals({
        targets: [{
            exchangeCode: 'BINANCE',
            coingeckoId: 'binance',
            coinmarketcapSlug: 'binance'
        }],
        connection,
        fetchers
    });

    assert.equal(result.runId, 42);
    assert.equal(result.signalsInserted, 1);

    const insertCalls = connection.calls.filter(call => call.sql.includes('upsert_exchange_ranking_signal'));
    assert.equal(insertCalls.length, 1);
    assert.ok(Array.isArray(insertCalls[0].params));
    assert.equal(insertCalls[0].params[2], 'test.metric');

    const finalizeCall = connection.calls.find(call => call.sql.includes('finalize_ranking_run'));
    assert.ok(finalizeCall);
    assert.match(finalizeCall.params[2], /Captured 1 exchange ranking signals/);

    const coinGeckoCall = fetchCallArgs.find(entry => entry.service === 'coingecko');
    assert.ok(coinGeckoCall);
    assert.equal(coinGeckoCall.options.exchangeId, 'binance');

    assert.equal(connection.closed, false);
});
