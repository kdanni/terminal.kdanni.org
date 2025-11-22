import { HttpResponse, http } from 'msw';
import {
  getAssetPage,
  getAssetClasses,
  getForexPage,
  getOhlcvFixture,
  getProfileFixture,
  getWatchList,
  resetAssets,
  toggleWatch
} from './fixtures';

const buildErrorResponse = (code: string, message: string, status = 400) =>
  HttpResponse.json({ error: { code, message } }, { status });

export const handlers = [
  http.get('*/api/assets', ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') ?? '';
    const page = Number(url.searchParams.get('page') ?? '1') || 1;
    const pageSize = Number(url.searchParams.get('pageSize') ?? '25') || 25;

    if (Number.isNaN(page) || Number.isNaN(pageSize) || page < 1 || pageSize < 1) {
      return buildErrorResponse('BAD_REQUEST', 'Invalid pagination parameters.', 400);
    }

    const payload = getAssetPage(search, page, pageSize);
    return HttpResponse.json(payload);
  }),

  http.get('*/api/forex', ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') ?? '';
    const base = url.searchParams.get('base') ?? '';
    const quote = url.searchParams.get('quote') ?? '';
    const group = url.searchParams.get('group') ?? '';
    const watched = (url.searchParams.get('watched') as 'true' | 'false' | 'any' | null) ?? 'any';
    const page = Number(url.searchParams.get('page') ?? '1') || 1;
    const pageSize = Number(url.searchParams.get('pageSize') ?? '25') || 25;

    if (Number.isNaN(page) || Number.isNaN(pageSize) || page < 1 || pageSize < 1) {
      return buildErrorResponse('BAD_REQUEST', 'Invalid pagination parameters.', 400);
    }

    const payload = getForexPage({ search, base, quote, group, watched, page, pageSize });
    return HttpResponse.json(payload);
  }),

  http.get('*/api/assets/classes', () => {
    return HttpResponse.json(getAssetClasses());
  }),

  http.get('*/api/watch-list', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1') || 1;
    const pageSize = Number(url.searchParams.get('pageSize') ?? '50') || 50;

    if (Number.isNaN(page) || Number.isNaN(pageSize) || page < 1 || pageSize < 1) {
      return buildErrorResponse('BAD_REQUEST', 'Invalid pagination parameters.', 400);
    }

    const payload = getWatchList(page, pageSize);
    return HttpResponse.json(payload);
  }),

  http.post('*/api/watch-list/toggle', async ({ request }) => {
    const body = await request.json();
    const result = toggleWatch(body);

    if (!result.success) {
      return buildErrorResponse(result.code, result.message, result.status);
    }

    return HttpResponse.json({ data: { ...result.asset, updatedAt: result.updatedAt } });
  }),

  http.get('*/api/me', () => {
    return HttpResponse.json({ data: getProfileFixture() });
  }),

  http.get('*/api/ohlcv', ({ request }) => {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol');
    const interval = url.searchParams.get('interval');
    const range = url.searchParams.get('range');
    const page = Number(url.searchParams.get('page') ?? '1') || 1;
    const pageSize = Number(url.searchParams.get('pageSize') ?? '500') || 500;

    if (!symbol || !interval || !range) {
      return buildErrorResponse('BAD_REQUEST', 'symbol, interval, and range are required.', 400);
    }

    const payload = getOhlcvFixture({ symbol, interval, range, page, pageSize });
    return HttpResponse.json(payload);
  }),

  http.post('*/api/reset-fixtures', () => {
    resetAssets();
    return HttpResponse.text('', { status: 204 });
  })
];
