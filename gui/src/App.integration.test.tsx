import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import App from './App';
import { ThemeProvider } from './theme';

const createBaseAuthState = () => ({
  isAuthenticated: true,
  isLoading: false,
  user: { name: 'Test User', email: 'user@example.com' },
  loginWithRedirect: vi.fn(),
  logout: vi.fn(),
  getAccessTokenSilently: vi.fn().mockResolvedValue('mock-token'),
  error: null
});

const authState = createBaseAuthState();

function resetAuthState(overrides: Partial<typeof authState> = {}): void {
  Object.assign(authState, createBaseAuthState(), overrides);
}

vi.mock('@auth0/auth0-react', async () => {
  const React = await import('react');
  return {
    useAuth0: () => authState,
    withAuthenticationRequired: (component: React.ComponentType<any>, options?: { onRedirecting?: () => React.ReactNode }) => {
      return function WithAuth(props: any) {
        if (!authState.isAuthenticated) {
          return options?.onRedirecting ? <>{options.onRedirecting()}</> : null;
        }

        const Component = component as React.ComponentType<any>;
        return <Component {...props} />;
      };
    },
    Auth0Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>
  };
});

function renderApp(path = '/catalog') {
  window.history.pushState({}, 'Test page', path);
  return render(
    <ThemeProvider>
      <App apiBaseUrl="http://localhost" />
    </ThemeProvider>
  );
}

describe('App integration (Auth-only)', () => {
  beforeEach(() => {
    resetAuthState();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the welcome page for authenticated users', async () => {
    renderApp('/catalog');

    expect(await screen.findByRole('heading', { level: 1, name: /welcome to the next phase/i })).toBeInTheDocument();
    expect(screen.getByText(/auth0 login flow enabled/i)).toBeInTheDocument();
  });

  it('shows the auth guard fallback on protected routes', async () => {
    resetAuthState({ isAuthenticated: false, isLoading: false });
    renderApp('/catalog');

    expect(await screen.findByText(/redirecting to login/i)).toBeInTheDocument();
  });
});
