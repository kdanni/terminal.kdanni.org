import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState, type FormEvent } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../theme';
import { sanitizeSearchTerm } from '../sanitizers';

export type PortalOutletContext = {
  globalSearch: string;
  setGlobalSearch: (value: string) => void;
};

export type PortalLayoutProps = {
  authError?: Error | null;
};

export function PortalLayout({ authError }: PortalLayoutProps): JSX.Element {
  const { isAuthenticated, isLoading, loginWithRedirect, logout, user } = useAuth0();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setSearchInput(globalSearch);
  }, [globalSearch]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmed = sanitizeSearchTerm(searchInput);
    setSearchInput(trimmed);
    setGlobalSearch(trimmed);

    if (!location.pathname.startsWith('/catalog')) {
      navigate('/catalog');
    }
  };

  const linkClassName = ({ isActive }: { isActive: boolean }): string =>
    isActive ? 'sidebar-link sidebar-link-active' : 'sidebar-link';

  return (
    <div className="portal-shell" aria-live="polite">
      <header className="portal-header">
        <NavLink to="/catalog" className="brand" aria-label="Terminal home">
          <div className="brand-logo" aria-hidden="true">
            KD
          </div>
          <div className="brand-copy">
            <span className="brand-title">Terminal</span>
            <span className="brand-subtitle">Asset Portal</span>
          </div>
        </NavLink>
        <form className="global-search" onSubmit={handleSubmit} role="search">
          <label htmlFor="global-search" className="visually-hidden">
            Search assets
          </label>
          <input
            id="global-search"
            type="search"
            placeholder="Global search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            autoComplete="off"
            className="search-input"
          />
          <button type="submit" className="search-button" disabled={isLoading}>
            Search
          </button>
        </form>
        <div className="auth-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={toggleTheme}
            aria-pressed={resolvedTheme === 'dark'}
            aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {resolvedTheme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
          {isAuthenticated ? (
            <>
              <div className="user-summary">
                {user?.picture ? (
                  <img src={user.picture} alt="Profile" className="user-avatar" />
                ) : (
                  <div className="avatar-fallback" aria-hidden="true">
                    {(user?.name ?? user?.email ?? '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="user-details">
                  <span className="user-name">{user?.name ?? user?.email ?? 'Authenticated user'}</span>
                  {user?.email ? <span className="user-email">{user.email}</span> : null}
                </div>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              >
                Log out
              </button>
            </>
          ) : (
            <button
              type="button"
              className="primary-button"
              disabled={isLoading}
              onClick={() => loginWithRedirect({ appState: { returnTo: window.location.pathname } })}
            >
              {isLoading ? 'Preparing login…' : 'Log in'}
            </button>
          )}
        </div>
      </header>
      {authError ? (
        <div role="alert" className="error-message portal-alert">
          {authError.message || 'Authentication error occurred.'}
        </div>
      ) : null}
      <div className="portal-body">
        <aside className="portal-sidebar">
          <h2 className="sidebar-title">Navigation</h2>
          <nav aria-label="Primary">
            <NavLink to="/catalog" className={linkClassName} end>
              Asset Catalog
            </NavLink>
            <NavLink to="/catalog/classes" className={linkClassName}>
              Asset Classes
            </NavLink>
            <NavLink to="/catalog/regions/us" className={linkClassName}>
              Regional (US)
            </NavLink>
            <NavLink to="/watch-list" className={linkClassName}>
              My Watch List
            </NavLink>
            <NavLink to="/ohlcv" className={linkClassName}>
              OHLCV Visualization
            </NavLink>
          </nav>
        </aside>
        <main className="portal-content">
          <Outlet context={{ globalSearch, setGlobalSearch } satisfies PortalOutletContext} />
        </main>
      </div>
    </div>
  );
}
