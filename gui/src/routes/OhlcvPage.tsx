import { Breadcrumbs } from '../components/Breadcrumbs';
import { OhlcvExplorer } from '../components/OhlcvExplorer';

export type OhlcvPageProps = {
  apiBaseUrl: string;
};

export function OhlcvPage({ apiBaseUrl }: OhlcvPageProps): JSX.Element {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Catalog', path: '/catalog' }, { label: 'OHLCV' }]} />
      <OhlcvExplorer apiBaseUrl={apiBaseUrl} />
    </>
  );
}

export default OhlcvPage;
