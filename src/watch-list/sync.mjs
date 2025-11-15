import { createAssetWatchListEntry, listAssetWatchListEntries, setAssetWatchListActiveStatus } from '../postgres/asset-watch-list.mjs';
import { getWatchListConnection, insertMysqlWatchListEntry, listMysqlWatchListEntries, updateMysqlWatchListActiveStatus } from '../mysql/watch-list.mjs';

function buildKey(symbol, exchange) {
    const normalizedSymbol = String(symbol ?? '').trim();
    const normalizedExchange = exchange == null ? '' : String(exchange).trim();
    return `${normalizedSymbol}::${normalizedExchange}`;
}

function normalizeExchangeForPg(exchange) {
    if (exchange == null) {
        return null;
    }

    const trimmed = String(exchange).trim();
    return trimmed.length === 0 ? null : trimmed;
}

function normalizeExchangeForMysql(exchange) {
    if (exchange == null) {
        return '';
    }

    const trimmed = String(exchange).trim();
    return trimmed;
}

function toDate(value) {
    if (!value) {
        return null;
    }

    return value instanceof Date ? value : new Date(value);
}

function isPgMoreRecent(pgEntry, mysqlEntry) {
    const pgUpdatedAt = toDate(pgEntry?.updated_at);
    const mysqlUpdatedAt = toDate(mysqlEntry?.updated_at);

    if (!pgUpdatedAt) {
        return false;
    }

    if (!mysqlUpdatedAt) {
        return true;
    }

    return pgUpdatedAt.getTime() > mysqlUpdatedAt.getTime();
}

function isMysqlMoreRecent(mysqlEntry, pgEntry) {
    const mysqlUpdatedAt = toDate(mysqlEntry?.updated_at);
    const pgUpdatedAt = toDate(pgEntry?.updated_at);

    if (!mysqlUpdatedAt) {
        return false;
    }

    if (!pgUpdatedAt) {
        return true;
    }

    return mysqlUpdatedAt.getTime() > pgUpdatedAt.getTime();
}

export async function syncWatchLists() {
    console.info('[watch-list:sync] Starting synchronization');

    const mysqlConnection = await getWatchListConnection();
    try {
        const [pgEntries, mysqlEntries] = await Promise.all([
            listAssetWatchListEntries(),
            listMysqlWatchListEntries(mysqlConnection),
        ]);

        const pgMap = new Map();
        for (const entry of pgEntries) {
            const key = buildKey(entry.symbol, entry.exchange);
            pgMap.set(key, entry);
        }

        const mysqlMap = new Map();
        for (const entry of mysqlEntries) {
            const key = buildKey(entry.symbol, entry.exchange);
            mysqlMap.set(key, entry);
        }

        const allKeys = new Set([...pgMap.keys(), ...mysqlMap.keys()]);

        for (const key of allKeys) {
            const pgEntry = pgMap.get(key);
            const mysqlEntry = mysqlMap.get(key);

            if (!pgEntry && mysqlEntry) {
                console.info(`[watch-list:sync] Creating Postgres entry for ${mysqlEntry.symbol} (${mysqlEntry.exchange ?? 'GLOBAL'})`);
                await createAssetWatchListEntry({
                    symbol: mysqlEntry.symbol,
                    exchange: normalizeExchangeForPg(mysqlEntry.exchange),
                    active: mysqlEntry.active,
                });
                continue;
            }

            if (pgEntry && !mysqlEntry) {
                console.info(`[watch-list:sync] Creating MySQL entry for ${pgEntry.symbol} (${pgEntry.exchange ?? 'GLOBAL'})`);
                await insertMysqlWatchListEntry(mysqlConnection, {
                    symbol: pgEntry.symbol,
                    exchange: normalizeExchangeForMysql(pgEntry.exchange),
                    active: pgEntry.active,
                });
                continue;
            }

            if (!pgEntry || !mysqlEntry) {
                continue;
            }

            if (Boolean(pgEntry.active) === Boolean(mysqlEntry.active)) {
                continue;
            }

            if (isPgMoreRecent(pgEntry, mysqlEntry)) {
                console.info(`[watch-list:sync] Updating MySQL active flag for ${pgEntry.symbol} (${pgEntry.exchange ?? 'GLOBAL'}) to ${pgEntry.active}`);
                await updateMysqlWatchListActiveStatus(mysqlConnection, {
                    id: mysqlEntry.id,
                    active: pgEntry.active,
                });
                continue;
            }

            if (isMysqlMoreRecent(mysqlEntry, pgEntry)) {
                console.info(`[watch-list:sync] Updating Postgres active flag for ${mysqlEntry.symbol} (${mysqlEntry.exchange ?? 'GLOBAL'}) to ${mysqlEntry.active}`);
                await setAssetWatchListActiveStatus({
                    id: pgEntry.id,
                    active: mysqlEntry.active,
                });
                continue;
            }

            console.info(`[watch-list:sync] Resolving tie by favoring Postgres for ${pgEntry.symbol} (${pgEntry.exchange ?? 'GLOBAL'})`);
            await updateMysqlWatchListActiveStatus(mysqlConnection, {
                id: mysqlEntry.id,
                active: pgEntry.active,
            });
        }

        console.info('[watch-list:sync] Synchronization completed successfully');
    } finally {
        await mysqlConnection.end();
    }
}
