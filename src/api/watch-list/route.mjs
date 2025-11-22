import express from 'express';
import {
    createAssetWatchListEntry,
    getAssetWatchListEntryBySymbol,
    listAssetWatchListEntries,
    setAssetWatchListActiveStatus,
} from '../../postgres/asset-watch-list.mjs';
import {
    getWatchListConnection,
    getMysqlWatchListEntryByKey,
    insertMysqlWatchListEntry,
    updateMysqlWatchListActiveStatus,
} from '../../mysql/watch-list.mjs';

const router = express.Router();

function normalizeSymbol(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
}

function normalizeExchange(value) {
    if (value == null) {
        return null;
    }

    const trimmed = String(value).trim();
    return trimmed.length === 0 ? null : trimmed;
}

function parseBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === '1') {
            return true;
        }
        if (normalized === 'false' || normalized === '0') {
            return false;
        }
    }

    return null;
}

function formatPgEntry(entry) {
    if (!entry) {
        return null;
    }

    return {
        id: entry.id,
        symbol: entry.symbol,
        exchange: entry.exchange ?? null,
        active: Boolean(entry.active),
        createdAt: entry.created_at ? new Date(entry.created_at).toISOString() : null,
        updatedAt: entry.updated_at ? new Date(entry.updated_at).toISOString() : null,
    };
}

function formatWatchListEntry(entry) {
    return {
        watchListId: entry.id,
        symbol: entry.symbol,
        exchange: entry.exchange ?? null,
        watched: Boolean(entry.active),
        updatedAt: entry.updated_at ? new Date(entry.updated_at).toISOString() : null,
    };
}

function parsePositiveInteger(value, defaultValue) {
    if (value === undefined) {
        return defaultValue;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 1) {
        return null;
    }

    return Math.floor(parsed);
}

function formatMysqlEntry(entry) {
    if (!entry) {
        return null;
    }

    return {
        id: entry.id,
        symbol: entry.symbol,
        exchange: entry.exchange ?? null,
        active: Boolean(entry.active),
        createdAt: entry.created_at ? entry.created_at.toISOString() : null,
        updatedAt: entry.updated_at ? entry.updated_at.toISOString() : null,
    };
}

router.get('/', async (req, res, next) => {
    const page = parsePositiveInteger(req.query.page, 1);
    const pageSize = parsePositiveInteger(req.query.pageSize, 50);

    if (page === null || pageSize === null) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid pagination parameters.',
        });
    }

    try {
        const entries = await listAssetWatchListEntries();
        const offset = Math.max(0, (page - 1) * pageSize);
        const slicedEntries = entries.slice(offset, offset + pageSize);

        res.json({
            status: 'ok',
            data: slicedEntries.map(formatWatchListEntry),
            pagination: {
                total: entries.length,
                page,
                pageSize,
            },
        });
    } catch (error) {
        next(error);
    }
});

async function syncMysqlWatchList({ symbol, exchange, active }) {
    const connection = await getWatchListConnection();

    try {
        let entry = await getMysqlWatchListEntryByKey(connection, { symbol, exchange });

        if (!entry) {
            if (!active) {
                return null;
            }

            await insertMysqlWatchListEntry(connection, { symbol, exchange, active });
            entry = await getMysqlWatchListEntryByKey(connection, { symbol, exchange });
            return entry;
        }

        if (Boolean(entry.active) !== Boolean(active)) {
            await updateMysqlWatchListActiveStatus(connection, { id: entry.id, active });
            entry = await getMysqlWatchListEntryByKey(connection, { symbol, exchange });
        }

        return entry;
    } finally {
        await connection.end();
    }
}

async function toggleWatchStatus({ symbol, exchange, active }) {
    const existing = await getAssetWatchListEntryBySymbol({ symbol, exchange });
    let pgEntry = existing;

    if (!existing) {
        if (!active) {
            const mysqlEntry = await syncMysqlWatchList({ symbol, exchange, active });
            return {
                watched: false,
                postgres: null,
                mysql: formatMysqlEntry(mysqlEntry),
            };
        }

        const { entry } = await createAssetWatchListEntry({ symbol, exchange, active });
        pgEntry = entry;
    } else if (Boolean(existing.active) !== Boolean(active)) {
        const { entry } = await setAssetWatchListActiveStatus({ id: existing.id, active });
        pgEntry = entry;
    }

    const mysqlEntry = await syncMysqlWatchList({ symbol, exchange, active });

    return {
        watched: Boolean(pgEntry?.active ?? mysqlEntry?.active ?? false),
        postgres: formatPgEntry(pgEntry),
        mysql: formatMysqlEntry(mysqlEntry),
    };
}

router.post('/toggle', async (req, res, next) => {
    const symbol = normalizeSymbol(req.body?.symbol);
    const exchange = normalizeExchange(req.body?.exchange);
    const watched = parseBoolean(req.body?.watched ?? req.body?.active);

    if (!symbol) {
        return res.status(400).json({
            status: 'error',
            message: 'symbol is required',
        });
    }

    if (watched === null) {
        return res.status(400).json({
            status: 'error',
            message: 'watched must be a boolean value',
        });
    }

    try {
        const result = await toggleWatchStatus({ symbol, exchange, active: watched });
        res.json({
            status: 'ok',
            data: {
                symbol,
                exchange,
                watched: result.watched,
                watchListId: result.postgres?.id ?? result.mysql?.id ?? null,
                watchList: result,
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
