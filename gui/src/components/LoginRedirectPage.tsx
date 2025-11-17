import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { GlobalLoadingShell } from './GlobalLoadingShell';

function resolveReturnTo(search: string, fallback = '/catalog'): string {
  const params = new URLSearchParams(search);
  const requested = params.get('returnTo');

  if (!requested) {
    return fallback;
  }

  try {
    const parsed = new URL(requested, window.location.origin);

    if (parsed.origin === window.location.origin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch (error) {
    console.warn('Ignoring invalid returnTo parameter in login redirect', error);
  }

  return fallback;
}

export function LoginRedirectPage(): JSX.Element {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const location = useLocation();

  const returnTo = useMemo(() => resolveReturnTo(location.search), [location.search]);

  useEffect(() => {
    if (isLoading || isAuthenticated) {
      return;
    }

    void loginWithRedirect({ appState: { returnTo } });
  }, [isAuthenticated, isLoading, loginWithRedirect, returnTo]);

  if (isAuthenticated) {
    return <Navigate to={returnTo} replace />;
  }

  return <GlobalLoadingShell visible message="Redirecting to login…" />;
}
