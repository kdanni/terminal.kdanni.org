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

  const search = normalizeQueryValue(query.search ?? query.q);
  if (search) {
    const like = `%${search.toLowerCase()}%`;
    conditions.push('(');
    conditions.push('  LOWER(c.symbol) LIKE ?');
    conditions.push('  OR LOWER(c.name) LIKE ?');
    conditions.push('  OR LOWER(c.category) LIKE ?');
    conditions.push('  OR LOWER(c.description) LIKE ?');
    conditions.push(')');
    params.push(like, like, like, like);
  }

  const ticker = normalizeQueryValue(query.ticker ?? query.symbol);
  if (ticker) {
    conditions.push('LOWER(c.symbol) LIKE ?');
    params.push(`%${ticker.toLowerCase()}%`);
  }

  const name = normalizeQueryValue(query.name);
  if (name) {
    conditions.push('LOWER(c.name) LIKE ?');
    params.push(`%${name.toLowerCase()}%`);
  }

  const category = normalizeQueryValue(query.category ?? query.type);
  if (category) {
    conditions.push('LOWER(c.category) LIKE ?');
    params.push(`%${category.toLowerCase()}%`);
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

function mapCommodityRow(row) {
  return {
    assetType: 'commodity',
    symbol: row.symbol,
    name: row.name,
    currency: null,
    exchange: null,
    micCode: null,
    country: null,
    type: row.category ?? null,
    category: row.category ?? null,
    description: row.description ?? null,
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
      c.symbol,
      c.name,
      c.category,
      c.description,
      wl.id AS watch_list_id,
      wl.active AS watch_active,
      wl.updated_at AS watch_updated_at
    FROM commodities c
    LEFT JOIN watch_list wl
      ON wl.symbol = c.symbol
     AND wl.exchange = ''
    ${clause}
    ORDER BY c.symbol ASC
    LIMIT ? OFFSET ?;
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM commodities c
    LEFT JOIN watch_list wl
      ON wl.symbol = c.symbol
     AND wl.exchange = ''
    ${clause};
  `;

  try {
    const [rows] = await pool.query(dataQuery, [...params, pagination.pageSize, pagination.offset]);
    const [countRows] = await pool.query(countQuery, params);
    const total = countRows?.[0]?.total ? Number(countRows[0].total) : 0;
    const totalPages = pagination.pageSize > 0 ? Math.ceil(total / pagination.pageSize) : 0;

    res.json({
      status: 'ok',
      data: rows.map(mapCommodityRow),
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
