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
