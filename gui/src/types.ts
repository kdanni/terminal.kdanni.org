export type Asset = {
  symbol: string;
  name: string;
  assetType?: string;
  exchange?: string | null;
  currency?: string | null;
  country?: string | null;
  type?: string | null;
  category?: string | null;
  watched?: boolean;
  watchListId?: string | number | null;
};

export type ToggleWatchRequest = {
  symbol: string;
  exchange?: string | null;
  watched: boolean;
  asset?: Asset;
};

export type AssetClassSummary = {
  assetType: string;
  total?: number;
};

export type WatchListEntry = {
  watchListId: string | number;
  symbol: string;
  exchange: string | null;
  watched: boolean;
  updatedAt?: string;
};

export type WatchListResponse = {
  data: WatchListEntry[];
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
  };
};
