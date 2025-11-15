import express from 'express';
import { pool } from '../../mysql/mysql2-env-connection.mjs';

const router = express.Router();

const UNIFIED_ASSETS_SOURCE = `
    SELECT
        'stock' AS asset_type,
        symbol,
        name,
        currency,
        exchange,
        COALESCE(exchange, '') AS normalized_exchange,
        mic_code,
        country,
        type,
        figi_code,
        isin,
        cusip,
        NULL AS category,
        NULL AS currency_base,
        NULL AS currency_quote
    FROM stocks_list
    UNION ALL
    SELECT
        'etf' AS asset_type,
        symbol,
        name,
        currency,
        exchange,
        COALESCE(exchange, '') AS normalized_exchange,
        mic_code,
        country,
        'ETF' AS type,
        figi_code,
        isin,
        cusip,
        NULL AS category,
        NULL AS currency_base,
        NULL AS currency_quote
    FROM etf
    UNION ALL
    SELECT
        'fund' AS asset_type,
        symbol,
        name,
        currency,
        exchange,
        COALESCE(exchange, '') AS normalized_exchange,
        mic_code,
        country,
        type,
        figi_code,
        isin,
        cusip,
        NULL AS category,
        NULL AS currency_base,
        NULL AS currency_quote
    FROM funds
    UNION ALL
    SELECT
        'fixed_income' AS asset_type,
        symbol,
        name,
        currency,
        exchange,
        COALESCE(exchange, '') AS normalized_exchange,
        mic_code,
        country,
        type,
        NULL AS figi_code,
        NULL AS isin,
        NULL AS cusip,
        NULL AS category,
        NULL AS currency_base,
        NULL AS currency_quote
    FROM fixed_income
    UNION ALL
    SELECT
        'commodity' AS asset_type,
        symbol,
        name,
        NULL AS currency,
        NULL AS exchange,
        '' AS normalized_exchange,
        NULL AS mic_code,
        NULL AS country,
        category AS type,
        NULL AS figi_code,
        NULL AS isin,
        NULL AS cusip,
        category AS category,
        NULL AS currency_base,
        NULL AS currency_quote
    FROM commodities
    UNION ALL
    SELECT
        'forex' AS asset_type,
        symbol,
        symbol AS name,
        NULL AS currency,
        NULL AS exchange,
        '' AS normalized_exchange,
        NULL AS mic_code,
        NULL AS country,
        currency_group AS type,
        NULL AS figi_code,
        NULL AS isin,
        NULL AS cusip,
        NULL AS category,
        currency_base AS currency_base,
        currency_quote AS currency_quote
    FROM forex_pairs_list
    UNION ALL
    SELECT
        'cryptocurrency' AS asset_type,
        symbol,
        symbol AS name,
        NULL AS currency,
        NULL AS exchange,
        '' AS normalized_exchange,
        NULL AS mic_code,
        NULL AS country,
        NULL AS type,
        NULL AS figi_code,
        NULL AS isin,
        NULL AS cusip,
        NULL AS category,
        currency_base AS currency_base,
        currency_quote AS currency_quote
    FROM cryptocurrency_pairs
`;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 200;

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
            LOWER(assets.symbol) LIKE ?
            OR LOWER(assets.name) LIKE ?
            OR LOWER(COALESCE(assets.currency, '')) LIKE ?
            OR LOWER(assets.normalized_exchange) LIKE ?
        )`);
        params.push(like, like, like, like);
    }

    const assetType = normalizeQueryValue(query.assetType ?? query.type);
    if (assetType) {
        conditions.push('LOWER(assets.asset_type) = ?');
        params.push(assetType.toLowerCase());
    }

    const exchange = normalizeQueryValue(query.exchange);
    if (exchange) {
        conditions.push('LOWER(assets.normalized_exchange) = ?');
        params.push(exchange.toLowerCase());
    }

    const currency = normalizeQueryValue(query.currency);
    if (currency) {
        conditions.push("LOWER(COALESCE(assets.currency, '')) = ?");
        params.push(currency.toLowerCase());
    }

    const country = normalizeQueryValue(query.country);
    if (country) {
        conditions.push("LOWER(COALESCE(assets.country, '')) = ?");
        params.push(country.toLowerCase());
    }

    const category = normalizeQueryValue(query.category);
    if (category) {
        conditions.push("LOWER(COALESCE(assets.type, assets.category, '')) = ?");
        params.push(category.toLowerCase());
    }

    const watched = normalizeQueryValue(query.watched);
    if (watched === 'true') {
        conditions.push('wl.active = 1');
    } else if (watched === 'false') {
        conditions.push('(wl.active = 0 OR wl.active IS NULL)');
    }

    const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { clause, params };
}

function mapAssetRow(row) {
    const exchange = row.exchange ?? null;

    return {
        assetType: row.asset_type,
        symbol: row.symbol,
        name: row.name,
        currency: row.currency ?? null,
        exchange: exchange === '' ? null : exchange,
        micCode: row.mic_code ?? null,
        country: row.country ?? null,
        type: row.type ?? null,
        figiCode: row.figi_code ?? null,
        isin: row.isin ?? null,
        cusip: row.cusip ?? null,
        category: row.category ?? null,
        currencyBase: row.currency_base ?? null,
        currencyQuote: row.currency_quote ?? null,
        watched: Boolean(row.watch_active),
        watchListId: row.watch_list_id ?? null,
        watchUpdatedAt: row.watch_updated_at ? new Date(row.watch_updated_at).toISOString() : null,
    };
}

router.get('/', async (req, res, next) => {
    const pagination = parsePagination(req.query);
    const { clause, params } = buildFilters(req.query);

    const dataQuery = `
        SELECT
            assets.asset_type,
            assets.symbol,
            assets.name,
            assets.currency,
            assets.exchange,
            assets.normalized_exchange,
            assets.mic_code,
            assets.country,
            assets.type,
            assets.figi_code,
            assets.isin,
            assets.cusip,
            assets.category,
            assets.currency_base,
            assets.currency_quote,
            wl.id AS watch_list_id,
            wl.active AS watch_active,
            wl.updated_at AS watch_updated_at
        FROM (${UNIFIED_ASSETS_SOURCE}) AS assets
        LEFT JOIN watch_list wl
            ON wl.symbol = assets.symbol
           AND wl.exchange = assets.normalized_exchange
        ${clause}
        ORDER BY assets.symbol ASC
        LIMIT ? OFFSET ?;
    `;

    const countQuery = `
        SELECT COUNT(*) AS total
        FROM (${UNIFIED_ASSETS_SOURCE}) AS assets
        LEFT JOIN watch_list wl
            ON wl.symbol = assets.symbol
           AND wl.exchange = assets.normalized_exchange
        ${clause};
    `;

    try {
        const [rows] = await pool.query(dataQuery, [...params, pagination.pageSize, pagination.offset]);
        const [countRows] = await pool.query(countQuery, params);
        const total = countRows?.[0]?.total ? Number(countRows[0].total) : 0;
        const totalPages = pagination.pageSize > 0 ? Math.ceil(total / pagination.pageSize) : 0;

        res.json({
            status: 'ok',
            data: rows.map(mapAssetRow),
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
