import express from 'express';
import { db } from '../../postgres/pgPromise-env-connection.mjs';

const router = express.Router();

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 500;
const MAX_PAGE_SIZE = 2000;

function normalizeSymbol(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed.toUpperCase();
}

function normalizeInterval(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim().toLowerCase();
    if (!/^\d+[a-z]+$/.test(trimmed)) {
        return null;
    }

    return trimmed;
}

function parseRange(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    if (trimmed.toLowerCase() === 'ytd') {
        const now = new Date();
        const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

        return {
            start,
            label: 'YTD',
        };
    }

    const match = trimmed.match(/^(\d+)\s*(h|hr|hour|hours|d|day|days|w|week|weeks|m|mo|mon|month|months|y|yr|year|years)$/i);
    if (!match) {
        return null;
    }

    const amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount <= 0) {
        return null;
    }

    const unit = match[2].toLowerCase();
    const now = new Date();
    const start = new Date(now);
    let normalizedUnit = 'D';

    if (unit === 'h' || unit === 'hr' || unit === 'hour' || unit === 'hours') {
        start.setHours(start.getHours() - amount);
        normalizedUnit = 'H';
    } else if (unit === 'w' || unit === 'week' || unit === 'weeks') {
        start.setDate(start.getDate() - (amount * 7));
        normalizedUnit = 'W';
    } else if (unit === 'm' || unit === 'mo' || unit === 'mon' || unit === 'month' || unit === 'months') {
        start.setMonth(start.getMonth() - amount);
        normalizedUnit = 'M';
    } else if (unit === 'y' || unit === 'yr' || unit === 'year' || unit === 'years') {
        start.setFullYear(start.getFullYear() - amount);
        normalizedUnit = 'Y';
    } else {
        start.setDate(start.getDate() - amount);
        normalizedUnit = 'D';
    }

    return {
        start,
        label: `${amount}${normalizedUnit}`,
    };
}

function parsePagination(query) {
    let page = Number.parseInt(query.page, 10);
    if (!Number.isFinite(page) || page < 1) {
        page = DEFAULT_PAGE;
    }

    let pageSize = Number.parseInt(query.pageSize, 10);
    if (!Number.isFinite(pageSize) || pageSize <= 0) {
        pageSize = DEFAULT_PAGE_SIZE;
    }

    pageSize = Math.min(pageSize, MAX_PAGE_SIZE);
    const offset = (page - 1) * pageSize;

    return { page, pageSize, offset };
}

function mapCandle(row) {
    return {
        timestamp: row.time instanceof Date ? row.time.toISOString() : new Date(row.time).toISOString(),
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: Number(row.volume),
    };
}

async function ensureSymbolExists(symbol) {
    const existing = await db.oneOrNone('SELECT 1 FROM ohlcv_data WHERE symbol = $1 LIMIT 1;', [symbol]);
    return Boolean(existing);
}

router.get('/', async (req, res, next) => {
    const symbol = normalizeSymbol(req.query.symbol);
    const interval = normalizeInterval(req.query.interval);
    const range = parseRange(req.query.range);
    const pagination = parsePagination(req.query);

    if (!symbol || !interval || !range) {
        return res.status(400).json({
            status: 'error',
            message: 'symbol, interval, and range are required.',
        });
    }

    try {
        const symbolExists = await ensureSymbolExists(symbol);
        if (!symbolExists) {
            return res.status(404).json({
                status: 'error',
                message: 'Symbol not found.',
            });
        }

        const countRow = await db.one(
            'SELECT COUNT(*) AS total FROM ohlcv_data WHERE symbol = $[symbol] AND interval = $[interval] AND time >= $[start];',
            { symbol, interval, start: range.start.toISOString() },
        );
        const total = countRow?.total ? Number(countRow.total) : 0;

        const rows = total > 0
            ? await db.any(
                `
                SELECT time, open, high, low, close, volume
                FROM ohlcv_data
                WHERE symbol = $[symbol]
                  AND interval = $[interval]
                  AND time >= $[start]
                ORDER BY time ASC
                LIMIT $[limit] OFFSET $[offset];
                `,
                {
                    symbol,
                    interval,
                    start: range.start.toISOString(),
                    limit: pagination.pageSize,
                    offset: pagination.offset,
                },
            )
            : [];

        const totalPages = pagination.pageSize > 0 ? Math.ceil(total / pagination.pageSize) : 0;

        res.json({
            status: 'ok',
            data: {
                symbol,
                interval,
                range: range.label,
                candles: rows.map(mapCandle),
            },
            pagination: {
                total,
                totalPages,
                page: pagination.page,
                pageSize: pagination.pageSize,
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
