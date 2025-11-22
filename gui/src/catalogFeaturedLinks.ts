import type { FeaturedLink } from './routes/CatalogRoutes';

export const CATALOG_FEATURED_LINKS: FeaturedLink[] = [
  {
    title: 'US Market View',
    description: 'Preset filters for US exchanges, USD currency, and compliance guidance.',
    to: '/catalog/regions/us'
  },
  {
    title: 'ETF Catalog',
    description: 'ETF-only view with curated facets and dividend/income quick filters.',
    to: '/catalog/classes/etf'
  },
  {
    title: 'Forex Pairs',
    description: 'Search base/quote pairs with USD majors pre-highlighted.',
    to: '/catalog/classes/forex'
  },
  {
    title: 'Crypto pairs',
    description: 'Jump straight to the dedicated crypto catalog with venue filters.',
    to: '/crypto'
  }
];
