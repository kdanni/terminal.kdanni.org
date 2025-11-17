import { rest } from 'msw';
import {
  getAssetPage,
  getOhlcvFixture,
  getProfileFixture,
  getWatchList,
  resetAssets,
  toggleWatch
} from './fixtures';

function buildErrorResponse(code: string, message: string, status = 400) {
  return { status, body: { error: { code, message } } };
}

export const handlers = [
  rest.get('*/api/assets', (req, res, ctx) => {
    const search = req.url.searchParams.get('search') ?? '';
    const page = Number(req.url.searchParams.get('page') ?? '1') || 1;
    const pageSize = Number(req.url.searchParams.get('pageSize') ?? '25') || 25;

    if (Number.isNaN(page) || Number.isNaN(pageSize) || page < 1 || pageSize < 1) {
      const { status, body } = buildErrorResponse('BAD_REQUEST', 'Invalid pagination parameters.', 400);
      return res(ctx.status(status), ctx.json(body));
    }

    const payload = getAssetPage(search, page, pageSize);
    return res(ctx.status(200), ctx.json(payload));
  }),

  rest.get('*/api/watch-list', (req, res, ctx) => {
    const page = Number(req.url.searchParams.get('page') ?? '1') || 1;
    const pageSize = Number(req.url.searchParams.get('pageSize') ?? '50') || 50;

    if (Number.isNaN(page) || Number.isNaN(pageSize) || page < 1 || pageSize < 1) {
      const { status, body } = buildErrorResponse('BAD_REQUEST', 'Invalid pagination parameters.', 400);
      return res(ctx.status(status), ctx.json(body));
    }

    const payload = getWatchList(page, pageSize);
    return res(ctx.status(200), ctx.json(payload));
  }),

  rest.post('*/api/watch-list/toggle', async (req, res, ctx) => {
    const body = await req.json();
    const result = toggleWatch(body);

    if (!result.success) {
      const { status, code, message } = result;
      return res(ctx.status(status), ctx.json({ error: { code, message } }));
    }

    return res(ctx.status(200), ctx.json({ data: { ...result.asset, updatedAt: result.updatedAt } }));
  }),

  rest.get('*/api/me', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ data: getProfileFixture() }));
  }),

  rest.get('*/api/ohlcv', (req, res, ctx) => {
    const symbol = req.url.searchParams.get('symbol');
    const interval = req.url.searchParams.get('interval');
    const range = req.url.searchParams.get('range');
    const page = Number(req.url.searchParams.get('page') ?? '1') || 1;
    const pageSize = Number(req.url.searchParams.get('pageSize') ?? '500') || 500;

    if (!symbol || !interval || !range) {
      const { status, body } = buildErrorResponse('BAD_REQUEST', 'symbol, interval, and range are required.', 400);
      return res(ctx.status(status), ctx.json(body));
    }

    const payload = getOhlcvFixture({ symbol, interval, range, page, pageSize });
    return res(ctx.status(200), ctx.json(payload));
  }),

  rest.post('*/api/reset-fixtures', (_req, res, ctx) => {
    resetAssets();
    return res(ctx.status(204));
  })
];
