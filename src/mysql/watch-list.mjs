import { createConnection } from '../db-install/connection.mjs';

const SELECT_ALL_WATCH_LIST = `
    SELECT id, symbol, exchange, active, created_at, updated_at
    FROM watch_list
    ORDER BY symbol, exchange;
`;

const INSERT_WATCH_LIST = `
    INSERT INTO watch_list (symbol, exchange, active)
    VALUES (?, COALESCE(?, ''), ?);
`;

const UPDATE_WATCH_LIST_ACTIVE = `
    UPDATE watch_list
    SET active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?;
`;

export async function getWatchListConnection() {
    return createConnection();
}

function normalizeExchange(value) {
    if (value == null) {
        return '';
    }

    const trimmed = String(value).trim();
    return trimmed;
}

export async function listMysqlWatchListEntries(connection) {
    const [rows] = await connection.execute(SELECT_ALL_WATCH_LIST);

    return rows.map(row => ({
        id: row.id,
        symbol: row.symbol,
        exchange: row.exchange === '' ? null : row.exchange,
        active: Boolean(row.active),
        created_at: row.created_at ? new Date(row.created_at) : null,
        updated_at: row.updated_at ? new Date(row.updated_at) : null,
    }));
}

export async function insertMysqlWatchListEntry(connection, { symbol, exchange = null, active = true }) {
    const normalizedExchange = normalizeExchange(exchange);
    const normalizedActive = active ? 1 : 0;

    await connection.execute(INSERT_WATCH_LIST, [symbol, normalizedExchange, normalizedActive]);
}

export async function updateMysqlWatchListActiveStatus(connection, { id, active }) {
    const normalizedActive = active ? 1 : 0;
    await connection.execute(UPDATE_WATCH_LIST_ACTIVE, [normalizedActive, id]);
}
