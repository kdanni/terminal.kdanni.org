import type { Asset } from '../types';

type Pagination = {
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

type ToggleRequest = {
  symbol?: string;
  exchange?: string | null;
  watched?: boolean;
};

type ToggleResult =
  | { success: true; asset: Asset; updatedAt: string }
  | { success: false; status: number; code: string; message: string };

type WatchListEntry = {
  watchListId: number | string;
  symbol: string;
  exchange: string | null;
  watched: boolean;
  updatedAt: string;
};

type PaginatedAssets = {
  data: Asset[];
  pagination: Pagination;
};

type PaginatedWatchList = {
  data: WatchListEntry[];
  pagination: Pagination;
};

type OhlcvRequest = {
  symbol?: string | null;
  interval?: string | null;
  range?: string | null;
  page: number;
  pageSize: number;
};

type Candle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type OhlcvResponse = {
  data: {
    symbol: string;
    interval: string;
    range: string;
    candles: Candle[];
  };
  pagination: Pagination;
};

const BASE_ASSETS: Asset[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    assetType: 'Equity',
    exchange: 'NASDAQ',
    currency: 'USD',
    country: 'US',
    type: 'Common Stock',
    watched: true,
    watchListId: 1
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    assetType: 'Equity',
    exchange: 'NASDAQ',
    currency: 'USD',
    country: 'US',
    type: 'Common Stock',
    watched: false,
    watchListId: null
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    assetType: 'Equity',
    exchange: 'NASDAQ',
    currency: 'USD',
    country: 'US',
    type: 'Common Stock',
    watched: true,
    watchListId: 2
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    assetType: 'Equity',
    exchange: 'NASDAQ',
    currency: 'USD',
    country: 'US',
    type: 'Common Stock',
    watched: false,
    watchListId: null
  },
  {
    symbol: 'BND',
    name: 'Vanguard Total Bond Market ETF',
    assetType: 'ETF',
    exchange: 'NYSEARCA',
    currency: 'USD',
    country: 'US',
    type: 'Bond Fund',
    watched: false,
    watchListId: null
  },
  {
    symbol: 'EFA',
    name: 'iShares MSCI EAFE ETF',
    assetType: 'ETF',
    exchange: 'NYSEARCA',
    currency: 'USD',
    country: 'US',
    type: 'Equity Fund',
    watched: false,
    watchListId: null
  }
];

let assets: Asset[] = BASE_ASSETS.map((asset) => ({ ...asset }));
let nextWatchListId = Math.max(...assets.map((asset) => Number(asset.watchListId ?? 0))) + 1;

function normalizeExchange(value?: string | null): string {
  if (value == null) {
    return '';
  }

  const trimmed = String(value).trim();
  return trimmed.length === 0 ? '' : trimmed;
}

function buildPagination(total: number, page: number, pageSize: number): Pagination {
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  return {
    total,
    totalPages,
    page,
    pageSize
  };
}

function filterAssets(search: string): Asset[] {
  if (!search) {
    return assets;
  }

  const terms = search.toLowerCase();
  return assets.filter((asset) => {
    return [
      asset.symbol,
      asset.name,
      asset.exchange,
      asset.currency,
      asset.country
    ]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(terms));
  });
}

export function getAssetPage(search: string, page: number, pageSize: number): PaginatedAssets {
  const filtered = filterAssets(search);
  const offset = Math.max(0, (page - 1) * pageSize);
  const pageItems = filtered.slice(offset, offset + pageSize);

  return {
    data: pageItems,
    pagination: buildPagination(filtered.length, page, pageSize)
  };
}

export function toggleWatch(request: ToggleRequest): ToggleResult {
  if (!request.symbol) {
    return { success: false, status: 400, code: 'BAD_REQUEST', message: 'symbol is required' };
  }

  const normalizedExchange = normalizeExchange(request.exchange);
  const targetIndex = assets.findIndex(
    (candidate) =>
      candidate.symbol.toUpperCase() === request.symbol?.toUpperCase() &&
      normalizeExchange(candidate.exchange).toUpperCase() === normalizedExchange.toUpperCase()
  );

  if (targetIndex === -1) {
    return { success: false, status: 404, code: 'NOT_FOUND', message: 'Asset not found' };
  }

  const watched = Boolean(request.watched);
  const updatedAsset = {
    ...assets[targetIndex],
    watched,
    watchListId: watched ? assets[targetIndex].watchListId ?? nextWatchListId++ : null
  } as Asset;

  assets[targetIndex] = updatedAsset;

  return { success: true, asset: updatedAsset, updatedAt: new Date().toISOString() };
}

export function getWatchList(page: number, pageSize: number): PaginatedWatchList {
  const watchedAssets = assets.filter((asset) => asset.watched);
  const offset = Math.max(0, (page - 1) * pageSize);
  const pageItems = watchedAssets.slice(offset, offset + pageSize).map<WatchListEntry>((asset) => ({
    watchListId: asset.watchListId ?? 0,
    symbol: asset.symbol,
    exchange: normalizeExchange(asset.exchange) || null,
    watched: true,
    updatedAt: new Date().toISOString()
  }));

  return {
    data: pageItems,
    pagination: buildPagination(watchedAssets.length, page, pageSize)
  };
}

export function getProfileFixture() {
  return {
    sub: 'auth0|sample-user',
    name: 'Sample Authenticated User',
    email: 'sample.user@example.com',
    picture: 'https://ui-avatars.com/api/?name=Sample+User',
    roles: ['viewer']
  };
}

function generateCandles(symbol: string, count: number): Candle[] {
  const candles: Candle[] = [];
  const start = Date.now();

  for (let index = 0; index < count; index += 1) {
    const timestamp = new Date(start - index * 24 * 60 * 60 * 1000);
    const open = 100 + Math.random() * 50;
    const close = open + (Math.random() - 0.5) * 2;
    const high = Math.max(open, close) + Math.random() * 2;
    const low = Math.min(open, close) - Math.random() * 2;
    const volume = Math.floor(1_000_000 + Math.random() * 9_000_000);

    candles.push({
      timestamp: timestamp.toISOString(),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume
    });
  }

  return candles.reverse();
}

export function getOhlcvFixture({ symbol, interval, range, page, pageSize }: OhlcvRequest): OhlcvResponse {
  const normalizedSymbol = symbol?.trim().toUpperCase();

  if (!normalizedSymbol || !interval || !range) {
    return {
      data: {
        symbol: normalizedSymbol ?? 'UNKNOWN',
        interval: interval ?? 'unknown',
        range: range ?? 'unknown',
        candles: []
      },
      pagination: buildPagination(0, page, pageSize)
    };
  }

  const total = 30;
  const offset = Math.max(0, (page - 1) * pageSize);
  const candles = generateCandles(normalizedSymbol, total).slice(offset, offset + pageSize);

  return {
    data: {
      symbol: normalizedSymbol,
      interval,
      range,
      candles
    },
    pagination: buildPagination(total, page, pageSize)
  };
}

export function resetAssets(): void {
  assets = BASE_ASSETS.map((asset) => ({ ...asset }));
  nextWatchListId = Math.max(...assets.map((asset) => Number(asset.watchListId ?? 0))) + 1;
}
