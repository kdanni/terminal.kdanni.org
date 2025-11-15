import { db } from './pgPromise-env-connection.mjs';

const UPSERT_STATEMENT = `
    CALL upsert_ohlcv_data(
        $[symbol],
        $[exchange],
        $[interval],
        $[time],
        $[open],
        $[high],
        $[low],
        $[close],
        $[volume]
    );
`;

function normalizeTime(value) {
    if (value instanceof Date) {
        return value.toISOString();
    }

    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) {
        throw new Error(`Invalid OHLC time value: ${value}`);
    }

    return date.toISOString();
}

function normalizeNumber(value, name) {
    const num = Number(value);
    if (!Number.isFinite(num)) {
        throw new Error(`Invalid OHLC numeric value for ${name}: ${value}`);
    }

    return num;
}

function normalizeVolume(value) {
    const vol = Number(value);
    if (!Number.isFinite(vol) || vol < 0) {
        return 0;
    }

    return Math.round(vol);
}

export async function upsertOhlcvRow({ symbol, exchange = null, interval, time, open, high, low, close, volume }) {
    const params = {
        symbol,
        exchange,
        interval,
        time: normalizeTime(time),
        open: normalizeNumber(open, 'open'),
        high: normalizeNumber(high, 'high'),
        low: normalizeNumber(low, 'low'),
        close: normalizeNumber(close, 'close'),
        volume: normalizeVolume(volume),
    };

    await db.none(UPSERT_STATEMENT, params);
}

export async function upsertOhlcvSeries(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
        return;
    }

    await db.tx(async tx => {
        for (const row of rows) {
            const params = {
                symbol: row.symbol,
                exchange: row.exchange ?? null,
                interval: row.interval,
                time: normalizeTime(row.time),
                open: normalizeNumber(row.open, 'open'),
                high: normalizeNumber(row.high, 'high'),
                low: normalizeNumber(row.low, 'low'),
                close: normalizeNumber(row.close, 'close'),
                volume: normalizeVolume(row.volume),
            };

            await tx.none(UPSERT_STATEMENT, params);
        }
    });
}
