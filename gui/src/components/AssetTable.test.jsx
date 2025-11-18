import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
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

  it('renders the retry action when provided', async () => {
    const handleRetry = vi.fn();
    const user = userEvent.setup();

    render(<AssetTable assets={[]} loading={false} onRetry={handleRetry} />);

    await user.click(screen.getByRole('button', { name: /retry search/i }));
    expect(handleRetry).toHaveBeenCalledTimes(1);
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

  it('sorts results when clicking a column header', async () => {
    const user = userEvent.setup();
    render(<AssetTable assets={assets} loading={false} />);

    const nameHeader = screen.getByRole('button', { name: /sort by name/i });
    await user.click(nameHeader);

    const rows = screen.getAllByRole('row').slice(1); // skip header row
    expect(rows[0]).toHaveTextContent('Apple Inc.');

    await user.click(nameHeader);
    const resortedRows = screen.getAllByRole('row').slice(1);
    expect(resortedRows[0]).toHaveTextContent('SPDR S&P 500 ETF Trust');
  });

  it('formats empty values and displays totals', () => {
    const partialAsset = {
      ...assets[0],
      exchange: null,
      currency: '',
      country: undefined,
      watched: false
    };

    render(
      <AssetTable assets={[partialAsset]} loading={false} totalCount={10} pendingWatchUpdates={new Set()} />
    );

    const row = screen.getByRole('row', { name: /asset row for aapl/i });
    expect(within(row).getAllByText('—').length).toBeGreaterThan(0);
    const countText = screen.getByText((_, element) => {
      if (!element) return false;
      const normalized = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      return element.classList.contains('table-count') && normalized.includes('Displaying 1 of 10 assets');
    });
    expect(countText).toBeInTheDocument();
  });

  it('allows keyboard toggling from a focused row', async () => {
    const handleToggleWatch = vi.fn();
    const user = userEvent.setup();
    render(<AssetTable assets={assets} loading={false} onToggleWatch={handleToggleWatch} />);

    const row = screen.getByLabelText('Asset row for AAPL');
    row.focus();

    await user.keyboard('{Enter}');

    expect(handleToggleWatch).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'AAPL', watched: false })
    );
  });
});
