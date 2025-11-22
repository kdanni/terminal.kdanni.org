import express from 'express';
import { pool } from '../../mysql/mysql2-env-connection.mjs';

const router = express.Router();

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

  const normalizeListValues = (value) => {
    const normalized = normalizeQueryValue(value);
    if (!normalized) {
      return [];
    }

    return normalized
      .split(/[|,]/)
      .map((part) => normalizeQueryValue(part))
      .filter(Boolean);
  };

  const search = normalizeQueryValue(query.search ?? query.q);
  if (search) {
    const like = `%${search.toLowerCase()}%`;
    conditions.push('(');
    conditions.push('  LOWER(etf.symbol) LIKE ?');
    conditions.push('  OR LOWER(etf.name) LIKE ?');
    conditions.push(')');
    params.push(like, like);
  }

  const ticker = normalizeQueryValue(query.ticker ?? query.symbol);
  if (ticker) {
    conditions.push('LOWER(etf.symbol) LIKE ?');
    params.push(`%${ticker.toLowerCase()}%`);
  }

  const name = normalizeQueryValue(query.name);
  if (name) {
    conditions.push('LOWER(etf.name) LIKE ?');
    params.push(`%${name.toLowerCase()}%`);
  }

  const exchange = normalizeQueryValue(query.exchange);
  if (exchange) {
    const exchanges = normalizeListValues(exchange);
    if (exchanges.length > 1) {
      const placeholders = exchanges.map(() => 'LOWER(etf.exchange) LIKE ?').join(' OR ');
      conditions.push(`(${placeholders})`);
      params.push(...exchanges.map((value) => `%${value.toLowerCase()}%`));
    } else {
      conditions.push('LOWER(etf.exchange) LIKE ?');
      params.push(`%${exchange.toLowerCase()}%`);
    }
  }

  const country = normalizeQueryValue(query.country);
  if (country) {
    conditions.push('LOWER(etf.country) LIKE ?');
    params.push(`%${country.toLowerCase()}%`);
  }

  const currency = normalizeQueryValue(query.currency);
  if (currency) {
    conditions.push('LOWER(etf.currency) LIKE ?');
    params.push(`%${currency.toLowerCase()}%`);
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

function mapEtfRow(row) {
  const exchange = row.exchange ?? null;
  return {
    assetType: 'etf',
    symbol: row.symbol,
    name: row.name,
    currency: row.currency ?? null,
    exchange: exchange === '' ? null : exchange,
    micCode: row.mic_code ?? null,
    country: row.country ?? null,
    type: row.type ?? 'ETF',
    figiCode: row.figi_code ?? null,
    isin: row.isin ?? null,
    cusip: row.cusip ?? null,
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
      etf.symbol,
      etf.name,
      etf.currency,
      etf.exchange,
      etf.mic_code,
      etf.country,
      'ETF' AS type,
      etf.figi_code,
      etf.isin,
      etf.cusip,
      wl.id AS watch_list_id,
      wl.active AS watch_active,
      wl.updated_at AS watch_updated_at
    FROM etf
    LEFT JOIN watch_list wl
      ON wl.symbol = etf.symbol
     AND wl.exchange = COALESCE(etf.exchange, '')
    ${clause}
    ORDER BY etf.symbol ASC
    LIMIT ? OFFSET ?;
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM etf
    LEFT JOIN watch_list wl
      ON wl.symbol = etf.symbol
     AND wl.exchange = COALESCE(etf.exchange, '')
    ${clause};
  `;

  try {
    const [rows] = await pool.query(dataQuery, [...params, pagination.pageSize, pagination.offset]);
    const [countRows] = await pool.query(countQuery, params);
    const total = countRows?.[0]?.total ? Number(countRows[0].total) : 0;
    const totalPages = pagination.pageSize > 0 ? Math.ceil(total / pagination.pageSize) : 0;

    res.json({
      status: 'ok',
      data: rows.map(mapEtfRow),
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
