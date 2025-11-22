import { Component, type ComponentType, type ErrorInfo, type ReactNode } from 'react';
import { useAuth0, withAuthenticationRequired } from '@auth0/auth0-react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { GlobalLoadingShell } from './components/GlobalLoadingShell';
import { LoginRedirectPage } from './components/LoginRedirectPage';
import { PortalLayout } from './components/PortalLayout';
import { WelcomePage } from './components/WelcomePage';
import { WatchListPage } from './components/WatchListPage';
import { logError } from './errorReporting';
import { StockPage } from './routes/StockPage';
import { EtfPage } from './routes/EtfPage';

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
    logError(error, { componentStack: errorInfo.componentStack });
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

const ProtectedWelcomePage = withPortalAuthentication(WelcomePage);
const ProtectedWatchListPage = withPortalAuthentication(WatchListPage);
const ProtectedStockPage = withPortalAuthentication(StockPage);
const ProtectedEtfPage = withPortalAuthentication(EtfPage);

function App({ apiBaseUrl }: AppProps): JSX.Element {
  const { error: authError } = useAuth0();

  return (
    <BrowserRouter>
      <AppErrorBoundary>
        <Routes>
          <Route path="/login" element={<LoginRedirectPage />} />
          <Route element={<PortalLayout authError={authError} />}>
            <Route index element={<Navigate to="/catalog" replace />} />
            <Route path="catalog" element={<ProtectedWelcomePage apiBaseUrl={apiBaseUrl} />} />
            <Route path="stock" element={<ProtectedStockPage apiBaseUrl={apiBaseUrl} />} />
            <Route path="etf" element={<ProtectedEtfPage apiBaseUrl={apiBaseUrl} />} />
            <Route path="watchlist" element={<ProtectedWatchListPage apiBaseUrl={apiBaseUrl} />} />
            <Route path="*" element={<Navigate to="/catalog" replace />} />
          </Route>
        </Routes>
      </AppErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
