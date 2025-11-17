import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssetTable from './AssetTable';

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

afterEach(() => {
  cleanup();
});

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

  it('allows toggling the watch status for an asset', async () => {
    const handleToggleWatch = vi.fn();
    const user = userEvent.setup();
    render(<AssetTable assets={assets} loading={false} onToggleWatch={handleToggleWatch} />);

    const toggle = screen.getByLabelText('Toggle watch status for AAPL');
    expect(toggle).toBeChecked();

    await user.click(toggle);

    expect(handleToggleWatch).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'AAPL', watched: false })
    );
  });

  it('disables the toggle when a watch update is pending', () => {
    const pending = new Set(['AAPL-NASDAQ']);
    render(<AssetTable assets={assets} loading={false} pendingWatchUpdates={pending} />);

    expect(screen.getByLabelText('Toggle watch status for AAPL')).toBeDisabled();
    expect(screen.getByText('Updating…')).toBeInTheDocument();
  });
});
