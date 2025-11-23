import { useAuth0 } from '@auth0/auth0-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTheme } from '../theme';

export type PortalLayoutProps = {
  authError?: Error | null;
};

export type PortalOutletContext = {
  globalSearch: string;
  setGlobalSearch: (term: string) => void;
};

export function PortalLayout({ authError }: PortalLayoutProps): JSX.Element {
  const { isAuthenticated, isLoading, loginWithRedirect, logout, user } = useAuth0();
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <div className="portal-shell" aria-live="polite">
      <header className="portal-header">
        <NavLink to="/catalog" className="brand" aria-label="Terminal home">
          <div className="brand-logo" aria-hidden="true">
            KD
          </div>
          <div className="brand-copy">
            <span className="brand-title">Terminal</span>
            <span className="brand-subtitle">Next-generation workspace</span>
          </div>
        </NavLink>
        <p className="header-lede">
          Streamlined, wide-screen canvas ready for the next iterations of the catalog experience.
        </p>
        <nav className="portal-nav" aria-label="Primary navigation">
          <NavLink
            to="/catalog"
            className={({ isActive }) => `portal-nav-link${isActive ? ' is-active' : ''}`}
          >
            Catalog
          </NavLink>
          <NavLink
            to="/stock"
            className={({ isActive }) => `portal-nav-link${isActive ? ' is-active' : ''}`}
          >
            Stocks
          </NavLink>
          <NavLink
            to="/etf"
            className={({ isActive }) => `portal-nav-link${isActive ? ' is-active' : ''}`}
          >
            ETFs
          </NavLink>
          <NavLink
            to="/fixincome"
            className={({ isActive }) => `portal-nav-link${isActive ? ' is-active' : ''}`}
          >
            Fixed income
          </NavLink>
          <NavLink
            to="/fund"
            className={({ isActive }) => `portal-nav-link${isActive ? ' is-active' : ''}`}
          >
            Funds
          </NavLink>
          <NavLink
            to="/forex"
            className={({ isActive }) => `portal-nav-link${isActive ? ' is-active' : ''}`}
          >
            Forex
          </NavLink>
          <NavLink
            to="/crypto"
            className={({ isActive }) => `portal-nav-link${isActive ? ' is-active' : ''}`}
          >
            Crypto
          </NavLink>
          <NavLink
            to="/commodity"
            className={({ isActive }) => `portal-nav-link${isActive ? ' is-active' : ''}`}
          >
            Commodities
          </NavLink>
          <NavLink
            to="/watchlist"
            className={({ isActive }) => `portal-nav-link${isActive ? ' is-active' : ''}`}
          >
            Watch list
          </NavLink>
        </nav>
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
      <main className="portal-content portal-content-wide">
        <Outlet />
      </main>
    </div>
  );
}
