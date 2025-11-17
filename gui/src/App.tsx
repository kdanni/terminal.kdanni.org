import { Component, Suspense, lazy, useEffect, type ComponentType, type ErrorInfo, type ReactNode } from 'react';
import { useAuth0, withAuthenticationRequired } from '@auth0/auth0-react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CATALOG_FEATURED_LINKS } from './catalogFeaturedLinks';
import { GlobalLoadingShell } from './components/GlobalLoadingShell';
import { PortalLayout } from './components/PortalLayout';

const loadCatalogRoutes = () => import('./routes/CatalogRoutes');
const CatalogPage = lazy(() => loadCatalogRoutes().then((module) => ({ default: module.CatalogPage })));
const AssetClassesIndex = lazy(() => loadCatalogRoutes().then((module) => ({ default: module.AssetClassesIndex })));
const AssetClassCatalogPage = lazy(() => loadCatalogRoutes().then((module) => ({ default: module.AssetClassCatalogPage })));
const RegionalIndexPage = lazy(() => loadCatalogRoutes().then((module) => ({ default: module.RegionalIndexPage })));
const UsRegionalCatalogPage = lazy(() => loadCatalogRoutes().then((module) => ({ default: module.UsRegionalCatalogPage })));
const OhlcvVisualizationPage = lazy(() => loadCatalogRoutes().then((module) => ({ default: module.OhlcvVisualizationPage })));
const WatchListPage = lazy(() => import('./components/WatchListPage').then((module) => ({ default: module.WatchListPage })));

type AppProps = {
  apiBaseUrl: string;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Unexpected error rendering the app', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" role="alert">
          <h2>Something went wrong.</h2>
          <p>We ran into an unexpected problem while rendering the page.</p>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.message}</pre>
          </details>
          <div className="error-boundary-actions">
            <button type="button" onClick={this.handleReset} className="secondary-button">
              Try again
            </button>
            <button type="button" onClick={() => window.location.reload()} className="primary-button">
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function withPortalAuthentication<P extends object>(component: ComponentType<P>): ComponentType<P> {
  return withAuthenticationRequired(component, {
    onRedirecting: () => <GlobalLoadingShell visible message="Redirecting to login…" />,
    returnTo: window.location.pathname
  });
}

const ProtectedCatalogPage = withPortalAuthentication(CatalogPage);
const ProtectedAssetClassesIndex = withPortalAuthentication(AssetClassesIndex);
const ProtectedAssetClassCatalogPage = withPortalAuthentication(AssetClassCatalogPage);
const ProtectedRegionalIndexPage = withPortalAuthentication(RegionalIndexPage);
const ProtectedUsRegionalCatalogPage = withPortalAuthentication(UsRegionalCatalogPage);
const ProtectedOhlcvVisualizationPage = withPortalAuthentication(OhlcvVisualizationPage);
const ProtectedWatchListPage = withPortalAuthentication(WatchListPage);

function App({ apiBaseUrl }: AppProps): JSX.Element {
  const { error: authError } = useAuth0();

  useEffect(() => {
    void loadCatalogRoutes();
    void import('./components/WatchListPage');
  }, []);

  return (
    <BrowserRouter>
      <AppErrorBoundary>
        <Suspense fallback={<GlobalLoadingShell visible message="Loading view…" />}>
          <Routes>
            <Route element={<PortalLayout authError={authError} />}>
              <Route index element={<Navigate to="/catalog" replace />} />
              <Route
                path="catalog"
                element={
                  <ProtectedCatalogPage
                    apiBaseUrl={apiBaseUrl}
                    title="Asset Catalog"
                    breadcrumbs={[{ label: 'Asset Catalog' }]}
                    featuredLinks={CATALOG_FEATURED_LINKS}
                  />
                }
              />
              <Route path="catalog/classes" element={<ProtectedAssetClassesIndex />} />
              <Route path="catalog/classes/:className" element={<ProtectedAssetClassCatalogPage apiBaseUrl={apiBaseUrl} />} />
              <Route path="catalog/regions" element={<ProtectedRegionalIndexPage />} />
              <Route path="catalog/regions/us" element={<ProtectedUsRegionalCatalogPage apiBaseUrl={apiBaseUrl} />} />
              <Route path="ohlcv" element={<ProtectedOhlcvVisualizationPage apiBaseUrl={apiBaseUrl} />} />
              <Route path="watch-list" element={<ProtectedWatchListPage apiBaseUrl={apiBaseUrl} />} />
              <Route path="*" element={<Navigate to="/catalog" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </AppErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
