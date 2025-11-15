import { createConnection } from '../mysql/mysql2-env-connection.mjs';
import { fetchBinanceExchangeSignals } from './clients/binance/exchange-signals.mjs';
import { fetchCoinGeckoExchangeSignals } from './clients/coingecko/exchange-signals.mjs';
import { fetchCoinMarketCapExchangeSignals } from './clients/coinmarketcap/exchange-signals.mjs';

const DEFAULT_TARGETS = [
    {
        exchangeCode: 'BINANCE',
        coingeckoId: 'binance',
        coinmarketcapSlug: 'binance'
    }
];

const defaultFetchers = {
    binance: fetchBinanceExchangeSignals,
    coingecko: fetchCoinGeckoExchangeSignals,
    coinmarketcap: fetchCoinMarketCapExchangeSignals
};

export function extractRunIdFromResult(rows) {
    if (!rows) {
        return undefined;
    }

    if (Array.isArray(rows)) {
        for (const value of rows) {
            const candidate = extractRunIdFromResult(value);
            if (candidate !== undefined) {
                return candidate;
            }
        }
        return undefined;
    }

    if (typeof rows === 'object' && rows !== null && 'run_id' in rows) {
        const coerced = Number(rows.run_id);
        return Number.isFinite(coerced) ? coerced : undefined;
    }

    return undefined;
}

function serializeJson(value) {
    if (value === undefined || value === null) {
        return null;
    }

    return JSON.stringify(value);
}

async function createRankingRun(connection, {
    effectiveAt,
    metadata,
    parameters,
    description
}) {
    const [rows] = await connection.query('CALL upsert_ranking_run(?, ?, ?, ?, ?, ?, ?)', [
        null,
        'exchange',
        effectiveAt,
        description,
        'collecting',
        serializeJson(metadata),
        serializeJson(parameters)
    ]);

    const runId = extractRunIdFromResult(rows);

    if (!runId) {
        throw new Error('Failed to determine run ID for exchange ranking collection.');
    }

    return runId;
}

async function finalizeRankingRun(connection, runId, { status, description, metadata }) {
    await connection.query('CALL finalize_ranking_run(?, ?, ?, ?)', [
        runId,
        status,
        description,
        serializeJson(metadata)
    ]);
}

async function persistExchangeSignals(connection, runId, signals) {
    for (const signal of signals) {
        await connection.query('CALL upsert_exchange_ranking_signal(?, ?, ?, ?, ?, ?, ?, ?, ?)', [
            runId,
            signal.exchangeCode,
            signal.metricKey,
            signal.metricValue ?? null,
            signal.metricText ?? null,
            signal.weight ?? null,
            signal.source ?? null,
            signal.observedAt ?? new Date(),
            serializeJson(signal.metadata)
        ]);
    }
}

async function gatherSignalsForTarget(target, fetchers) {
    const observedAt = new Date();
    const signals = [];

    if (target.coingeckoId && fetchers.coingecko) {
        const coingeckoSignals = await fetchers.coingecko({
            exchangeCode: target.exchangeCode,
            exchangeId: target.coingeckoId,
            observedAt
        });
        signals.push(...coingeckoSignals);
    }

    if (target.coinmarketcapSlug && fetchers.coinmarketcap) {
        const cmcSignals = await fetchers.coinmarketcap({
            exchangeCode: target.exchangeCode,
            slug: target.coinmarketcapSlug,
            observedAt
        });
        signals.push(...cmcSignals);
    }

    if (fetchers.binance) {
        const binanceSignals = await fetchers.binance({
            exchangeCode: target.exchangeCode,
            observedAt
        });
        signals.push(...binanceSignals);
    }

    return signals;
}

export async function collectExchangeRankingSignals({
    targets = DEFAULT_TARGETS,
    effectiveAt = new Date(),
    metadata,
    fetchers = defaultFetchers,
    connection: existingConnection,
    connectionFactory = createConnection
} = {}) {
    const connection = existingConnection ?? await connectionFactory();
    const shouldCloseConnection = !existingConnection;

    const parameters = { targets };
    const runMetadata = {
        job: 'exchange-ranking-signals',
        sources: Object.keys(fetchers),
        ...metadata
    };

    let runId;

    try {
        runId = await createRankingRun(connection, {
            effectiveAt,
            metadata: runMetadata,
            parameters,
            description: 'Automated exchange ranking signal capture'
        });

        let inserted = 0;
        for (const target of targets) {
            const targetSignals = await gatherSignalsForTarget(target, fetchers);
            await persistExchangeSignals(connection, runId, targetSignals);
            inserted += targetSignals.length;
        }

        await finalizeRankingRun(connection, runId, {
            status: 'collected',
            description: `Captured ${inserted} exchange ranking signals.`,
            metadata: {
                ...runMetadata,
                signalCount: inserted
            }
        });

        return { runId, signalsInserted: inserted };
    } finally {
        if (shouldCloseConnection) {
            await connection.end();
        }
    }
}
