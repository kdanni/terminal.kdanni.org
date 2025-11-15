import PropTypes from 'prop-types';

const TABLE_COLUMNS = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'name', label: 'Name' },
  { key: 'assetType', label: 'Type' },
  { key: 'exchange', label: 'Exchange' },
  { key: 'currency', label: 'Currency' },
  { key: 'country', label: 'Country' },
  { key: 'type', label: 'Category' },
  { key: 'watched', label: 'Watched' }
];

function formatValue(value) {
  if (value == null || value === '') {
    return '—';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return value;
}

function AssetTable({ assets, loading }) {
  if (loading) {
    return <div className="loading-indicator">Loading assets…</div>;
  }

  if (!assets.length) {
    return <div className="empty-state">No assets to display yet.</div>;
  }

  return (
    <div className="table-wrapper">
      <table className="asset-table">
        <thead>
          <tr>
            {TABLE_COLUMNS.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={`${asset.symbol}-${asset.exchange || 'na'}`}>
              <td>{asset.symbol}</td>
              <td>{asset.name}</td>
              <td>
                <span className="asset-type-badge">{formatValue(asset.assetType)}</span>
              </td>
              <td>{formatValue(asset.exchange)}</td>
              <td>{formatValue(asset.currency)}</td>
              <td>{formatValue(asset.country)}</td>
              <td>{formatValue(asset.type ?? asset.category)}</td>
              <td>{formatValue(asset.watched)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

AssetTable.propTypes = {
  assets: PropTypes.arrayOf(
    PropTypes.shape({
      assetType: PropTypes.string,
      symbol: PropTypes.string,
      name: PropTypes.string,
      exchange: PropTypes.string,
      currency: PropTypes.string,
      country: PropTypes.string,
      type: PropTypes.string,
      category: PropTypes.string,
      watched: PropTypes.bool
    })
  ),
  loading: PropTypes.bool
};

AssetTable.defaultProps = {
  assets: [],
  loading: false
};

export default AssetTable;
