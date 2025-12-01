import { db } from './pgPromise-env-connection.mjs';

const WATCH_LIST_COLUMNS = `
    id,
    symbol,
    exchange,
    active,
    created_at,
    updated_at
`;

const EXCEL_WATCH_LIST_COLUMNS = `
    id,
    excel_symbol,
    symbol,
    exchange,
    active,
    created_at,
    updated_at
`;

const WATCH_HISTORY_COLUMNS = `
    id,
    watch_list_id,
    active_from,
    inactive_at
`;

const INSERT_WATCH_LIST_ENTRY = `
    INSERT INTO asset_watch_list (symbol, exchange, active)
    VALUES ($[symbol], $[exchange], $[active])
    RETURNING ${WATCH_LIST_COLUMNS};
`;

const UPSERT_EXCEL_WATCH_LIST_ENTRY = `
    INSERT INTO excel_watch_list (symbol, exchange, excel_symbol, active)
    VALUES ($[symbol], $[exchange], $[excel_symbol], $[active])
    ON CONFLICT (excel_symbol)
    DO UPDATE SET
        active = EXCLUDED.active,
        updated_at = now()
    RETURNING ${EXCEL_WATCH_LIST_COLUMNS};
`;

const SELECT_WATCH_LIST_ENTRY_BY_ID = `
    SELECT ${WATCH_LIST_COLUMNS}
    FROM asset_watch_list
    WHERE id = $[id];
`;

const SELECT_WATCH_LIST_ENTRY_BY_SYMBOL = `
    SELECT ${WATCH_LIST_COLUMNS}
    FROM asset_watch_list
    WHERE symbol = $[symbol]
      AND COALESCE(exchange, '') = COALESCE($[exchange], '');
`;

const SELECT_ALL_WATCH_LIST_ENTRIES = `
    SELECT ${WATCH_LIST_COLUMNS}
    FROM asset_watch_list
    ORDER BY symbol, exchange NULLS FIRST;
`;

const SELECT_ACTIVE_WATCH_LIST_ENTRIES = `
    SELECT ${WATCH_LIST_COLUMNS}
    FROM asset_watch_list
    WHERE active = TRUE
    ORDER BY symbol, exchange NULLS FIRST;
`;

const UPDATE_WATCH_LIST_ACTIVE_STATUS = `
    UPDATE asset_watch_list
    SET active = $[active],
        updated_at = NOW()
    WHERE id = $[id]
    RETURNING ${WATCH_LIST_COLUMNS};
`;

const INSERT_WATCH_HISTORY_ENTRY = `
    INSERT INTO asset_watch_history (watch_list_id, active_from)
    VALUES ($[watchListId], NOW())
    RETURNING ${WATCH_HISTORY_COLUMNS};
`;

const CLOSE_WATCH_HISTORY_ENTRY = `
    UPDATE asset_watch_history
    SET inactive_at = NOW()
    WHERE id = (
        SELECT id
        FROM asset_watch_history
        WHERE watch_list_id = $[watchListId]
          AND inactive_at IS NULL
        ORDER BY active_from DESC
        LIMIT 1
    )
    RETURNING ${WATCH_HISTORY_COLUMNS};
`;

const SELECT_WATCH_HISTORY_BY_WATCH_LIST_ID = `
    SELECT ${WATCH_HISTORY_COLUMNS}
    FROM asset_watch_history
    WHERE watch_list_id = $[watchListId]
    ORDER BY active_from DESC;
`;

function normalizeSymbol(symbol) {
    if (typeof symbol !== 'string' || !symbol.trim()) {
        throw new Error('symbol is required');
    }

    return symbol.trim();
}

function normalizeExchange(exchange) {
    if (exchange == null) {
        return null;
    }

    const value = String(exchange).trim();
    return value.length === 0 ? null : value;
}

export async function createAssetWatchListEntry({ symbol, exchange = null, active = true }) {
    const normalizedSymbol = normalizeSymbol(symbol);
    const normalizedExchange = normalizeExchange(exchange);

    return db.tx(async tx => {
        const entry = await tx.one(INSERT_WATCH_LIST_ENTRY, {
            symbol: normalizedSymbol,
            exchange: normalizedExchange,
            active: Boolean(active),
        });

        if (!entry.active) {
            return { entry, historyEntry: null };
        }

        const historyEntry = await tx.one(INSERT_WATCH_HISTORY_ENTRY, {
            watchListId: entry.id,
        });

        return { entry, historyEntry };
    });
}

export async function upsertExcelWatchListEntry({ symbol, excel_symbol, exchange = null, active = true }) {
    const normalizedSymbol = normalizeSymbol(symbol);
    const normalizedExchange = normalizeExchange(exchange);

    return db.tx(async tx => {
        const entry = await tx.one(UPSERT_EXCEL_WATCH_LIST_ENTRY, {
            symbol: normalizedSymbol,
            exchange: normalizedExchange,
            excel_symbol: excel_symbol,
            active: Boolean(active),
        });
        return { entry };
    });
}

export async function getAssetWatchListEntryById(id) {
    return db.oneOrNone(SELECT_WATCH_LIST_ENTRY_BY_ID, { id });
}

export async function getAssetWatchListEntryBySymbol({ symbol, exchange = null }) {
    const normalizedSymbol = normalizeSymbol(symbol);
    const normalizedExchange = normalizeExchange(exchange);

    return db.oneOrNone(SELECT_WATCH_LIST_ENTRY_BY_SYMBOL, {
        symbol: normalizedSymbol,
        exchange: normalizedExchange,
    });
}

export async function listAssetWatchListEntries() {
    return db.any(SELECT_ALL_WATCH_LIST_ENTRIES);
}

export async function listActiveAssetWatchListEntries() {
    return db.any(SELECT_ACTIVE_WATCH_LIST_ENTRIES);
}

export async function setAssetWatchListActiveStatus({ id, active }) {
    return db.tx(async tx => {
        const current = await tx.oneOrNone(SELECT_WATCH_LIST_ENTRY_BY_ID, { id });

        if (!current) {
            throw new Error(`Asset watch list entry ${id} was not found.`);
        }

        const desiredState = Boolean(active);
        if (current.active === desiredState) {
            return { entry: current, historyEntry: null };
        }

        const entry = await tx.one(UPDATE_WATCH_LIST_ACTIVE_STATUS, {
            id,
            active: desiredState,
        });

        if (entry.active) {
            const historyEntry = await tx.one(INSERT_WATCH_HISTORY_ENTRY, {
                watchListId: entry.id,
            });
            return { entry, historyEntry };
        }

        const historyEntry = await tx.oneOrNone(CLOSE_WATCH_HISTORY_ENTRY, {
            watchListId: entry.id,
        });

        if (!historyEntry) {
            throw new Error(`Asset watch list entry ${id} does not have an active watch history to close.`);
        }

        return { entry, historyEntry };
    });
}

export async function getAssetWatchHistory(watchListId) {
    return db.any(SELECT_WATCH_HISTORY_BY_WATCH_LIST_ID, { watchListId });
}
