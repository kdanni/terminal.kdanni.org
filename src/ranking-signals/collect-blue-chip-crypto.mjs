import { createConnection } from '../mysql/mysql2-env-connection.mjs';
import { extractRunIdFromResult } from './collect-exchange-signals.mjs';
import { fetchCoinMarketCapAssetSignals } from './clients/coinmarketcap/asset-signals.mjs';

const DEFAULT_TARGETS = [
    { assetSymbol: 'BTC', slug: 'bitcoin' },
    { assetSymbol: 'ETH', slug: 'ethereum' },
    { assetSymbol: 'BNB', slug: 'bnb' },
    { assetSymbol: 'SOL', slug: 'solana' },
    { assetSymbol: 'XRP', slug: 'ripple' }
];

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
        'asset',
        effectiveAt,
        description,
        'collecting',
        serializeJson(metadata),
        serializeJson(parameters)
    ]);

    const runId = extractRunIdFromResult(rows);

    if (!runId) {
        throw new Error('Failed to determine run ID for blue chip crypto collection.');
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

async function persistAssetSignals(connection, runId, signals) {
    for (const signal of signals) {
        await connection.query('CALL upsert_asset_ranking_signal(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
            runId,
            signal.assetSymbol,
            signal.assetType ?? 'cryptocurrency',
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

export async function collectBlueChipCryptoSignals({
    targets = DEFAULT_TARGETS,
    convert = 'USD',
    effectiveAt = new Date(),
    metadata,
    fetcher = fetchCoinMarketCapAssetSignals,
    connection: existingConnection,
    connectionFactory = createConnection
} = {}) {
    const connection = existingConnection ?? await connectionFactory();
    const shouldCloseConnection = !existingConnection;
    const normalizedConvert = String(convert ?? 'USD').toUpperCase();

    const parameters = { targets, convert: normalizedConvert };
    const runMetadata = {
        job: 'blue-chip-crypto',
        source: 'coinmarketcap',
        convert: normalizedConvert,
        ...metadata
    };

    let runId;

    try {
        runId = await createRankingRun(connection, {
            effectiveAt,
            metadata: runMetadata,
            parameters,
            description: 'Automated blue chip crypto signal capture'
        });

        let inserted = 0;
        for (const target of targets) {
            const observedAt = new Date();
            const signals = await fetcher({
                assetSymbol: target.assetSymbol,
                slug: target.slug,
                convert: normalizedConvert,
                observedAt
            });

            await persistAssetSignals(connection, runId, signals);
            inserted += signals.length;
        }

        await finalizeRankingRun(connection, runId, {
            status: 'collected',
            description: `Captured ${inserted} CoinMarketCap blue chip crypto signals.`,
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
