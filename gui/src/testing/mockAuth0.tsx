import { createContext, useContext, useMemo, useState } from 'react';

const MockAuthContext = createContext({
  isAuthenticated: true,
  isLoading: false,
  user: { name: 'Mock User', email: 'mock@example.com' },
  loginWithRedirect: async () => {},
  logout: async () => {},
  getAccessTokenSilently: async () => 'mock-token',
  error: null as Error | null
});

export function Auth0Provider({ children }: { children: React.ReactNode }): JSX.Element {
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  const value = useMemo(
    () => ({
      isAuthenticated,
      isLoading: false,
      user: isAuthenticated ? { name: 'Mock User', email: 'mock@example.com' } : undefined,
      loginWithRedirect: async () => {
        setIsAuthenticated(true);
      },
      logout: async () => {
        setIsAuthenticated(false);
      },
      getAccessTokenSilently: async () => 'mock-token',
      error: null
    }),
    [isAuthenticated]
  );

  return <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>;
}

export function useAuth0() {
  return useContext(MockAuthContext);
}

export function withAuthenticationRequired<TProps>(
  Component: React.ComponentType<TProps>,
  options?: { onRedirecting?: () => React.ReactNode }
) {
  return function WithAuth(props: TProps) {
    const auth = useAuth0();

    if (!auth.isAuthenticated) {
      return options?.onRedirecting ? <>{options.onRedirecting()}</> : null;
    }

    return <Component {...props} />;
  };
}
