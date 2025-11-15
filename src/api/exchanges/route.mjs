import express from 'express';
import { pool } from '../../mysql/mysql2-env-connection.mjs';

const router = express.Router();

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 200;

const EXCHANGE_COLUMNS = `
    code,
    name,
    country,
    city,
    timezone,
    currency,
    mic_code,
    acronym,
    website,
    phone,
    address,
    created_at,
    updated_at
`;

function normalizeQueryValue(value) {
    if (value == null) {
        return null;
    }

    const trimmed = String(value).trim();
    return trimmed.length === 0 ? null : trimmed;
}

function parsePagination(query) {
    let page = Number.parseInt(query.page, 10);
    if (!Number.isFinite(page) || page < 1) {
        page = DEFAULT_PAGE;
    }

    let pageSize = Number.parseInt(query.pageSize ?? query.limit, 10);
    if (!Number.isFinite(pageSize) || pageSize <= 0) {
        pageSize = DEFAULT_PAGE_SIZE;
    }

    pageSize = Math.min(pageSize, MAX_PAGE_SIZE);
    const offset = (page - 1) * pageSize;

    return { page, pageSize, offset };
}

function buildFilters(query) {
    const conditions = [];
    const params = [];

    const search = normalizeQueryValue(query.search ?? query.q);
    if (search) {
        const like = `%${search.toLowerCase()}%`;
        conditions.push(`(
            LOWER(exchanges.code) LIKE ?
            OR LOWER(exchanges.name) LIKE ?
            OR LOWER(COALESCE(exchanges.currency, '')) LIKE ?
            OR LOWER(COALESCE(exchanges.country, '')) LIKE ?
        )`);
        params.push(like, like, like, like);
    }

    const currency = normalizeQueryValue(query.currency);
    if (currency) {
        conditions.push("LOWER(COALESCE(exchanges.currency, '')) = ?");
        params.push(currency.toLowerCase());
    }

    const country = normalizeQueryValue(query.country);
    if (country) {
        conditions.push("LOWER(COALESCE(exchanges.country, '')) = ?");
        params.push(country.toLowerCase());
    }

    const timezone = normalizeQueryValue(query.timezone);
    if (timezone) {
        conditions.push("LOWER(COALESCE(exchanges.timezone, '')) = ?");
        params.push(timezone.toLowerCase());
    }

    const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { clause, params };
}

function mapExchangeRow(row) {
    return {
        code: row.code,
        name: row.name,
        country: row.country ?? null,
        city: row.city ?? null,
        timezone: row.timezone ?? null,
        currency: row.currency ?? null,
        micCode: row.mic_code ?? null,
        acronym: row.acronym ?? null,
        website: row.website ?? null,
        phone: row.phone ?? null,
        address: row.address ?? null,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    };
}

router.get('/', async (req, res, next) => {
    const pagination = parsePagination(req.query);
    const { clause, params } = buildFilters(req.query);

    const dataQuery = `
        SELECT ${EXCHANGE_COLUMNS}
        FROM exchanges_catalog AS exchanges
        ${clause}
        ORDER BY exchanges.name ASC
        LIMIT ? OFFSET ?;
    `;

    const countQuery = `
        SELECT COUNT(*) AS total
        FROM exchanges_catalog AS exchanges
        ${clause};
    `;

    try {
        const [rows] = await pool.query(dataQuery, [...params, pagination.pageSize, pagination.offset]);
        const [countRows] = await pool.query(countQuery, params);
        const total = countRows?.[0]?.total ? Number(countRows[0].total) : 0;
        const totalPages = pagination.pageSize > 0 ? Math.ceil(total / pagination.pageSize) : 0;

        res.json({
            status: 'ok',
            data: rows.map(mapExchangeRow),
            pagination: {
                page: pagination.page,
                pageSize: pagination.pageSize,
                total,
                totalPages,
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
