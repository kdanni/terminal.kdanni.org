import { pool } from '../../mysql/mysql2-env-connection.mjs';

export async function persistExchangeCatalog(exchanges) {
    if (!Array.isArray(exchanges) || exchanges.length === 0) {
        return { upserted: 0 };
    }

    const connection = await pool.getConnection();
    let upserted = 0;

    try {
        for (const exchange of exchanges) {
            await connection.query('CALL upsert_exchange(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                exchange.code,
                exchange.name,
                exchange.country ?? null,
                exchange.city ?? null,
                exchange.timezone ?? null,
                exchange.currency ?? null,
                exchange.mic_code ?? null,
                exchange.acronym ?? null,
                exchange.website ?? null,
                exchange.phone ?? null,
                exchange.address ?? null
            ]);
            upserted += 1;
        }
    } finally {
        connection.release();
    }

    return { upserted };
}
