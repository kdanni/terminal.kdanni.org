import { render, screen } from '@testing-library/react';
import AssetTable from './AssetTable.jsx';

const assets = [
  {
    assetType: 'stock',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    currency: 'USD',
    country: 'United States',
    type: 'Common Stock',
    watched: true
  },
  {
    assetType: 'etf',
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    exchange: 'NYSE',
    currency: 'USD',
    country: 'United States',
    type: 'ETF',
    watched: false
  }
];

describe('AssetTable', () => {
  it('renders a loading state', () => {
    render(<AssetTable assets={[]} loading />);
    expect(screen.getByText(/loading assets/i)).toBeInTheDocument();
  });

  it('renders an empty state when there are no assets', () => {
    render(<AssetTable assets={[]} loading={false} />);
    expect(screen.getByText(/no assets to display yet/i)).toBeInTheDocument();
  });

  it('renders the asset rows when assets are provided', () => {
    render(<AssetTable assets={assets} loading={false} />);

    for (const asset of assets) {
      expect(screen.getByText(asset.symbol)).toBeInTheDocument();
      expect(screen.getByText(asset.name)).toBeInTheDocument();
    }
  });
});
