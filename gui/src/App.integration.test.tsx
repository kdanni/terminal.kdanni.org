import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import App from './App';
import { ThemeProvider } from './theme';
import { server } from './mocks/server';

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

describe('App integration (MSW)', () => {
  beforeEach(() => {
    resetAuthState();
  });

  afterEach(() => {
    cleanup();
  });

  it('searches the catalog and renders filtered rows', async () => {
    const user = userEvent.setup();
    renderApp('/catalog');

    const [heading] = await screen.findAllByRole('heading', { level: 1, name: /asset catalog/i });
    expect(heading).toBeInTheDocument();
    await screen.findByRole('row', { name: /asset row for aapl/i });

    const searchInput = screen.getByLabelText(/search assets/i);
    await user.clear(searchInput);
    await user.type(searchInput, 'NVDA');
    await user.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => expect(screen.getByRole('cell', { name: 'NVDA' })).toBeInTheDocument());
    expect(screen.queryByRole('cell', { name: 'AAPL' })).not.toBeInTheDocument();
  });

  it('paginates through API results', async () => {
    const user = userEvent.setup();

    server.use(
      http.get('*/api/assets', ({ request }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get('page') ?? '1') || 1;
        const payload = {
          data: [
            {
              symbol: `PAGE${page}`,
              name: `Page ${page} Asset`,
              assetType: 'Equity',
              exchange: 'TEST',
              currency: 'USD',
              country: 'US',
              type: 'Common',
              watched: false
            }
          ],
          pagination: { total: 2, totalPages: 2, page, pageSize: 1 }
        };

        return HttpResponse.json(payload);
      })
    );

    renderApp('/catalog');

    const [heading] = await screen.findAllByRole('heading', { level: 1, name: /asset catalog/i });
    expect(heading).toBeInTheDocument();
    expect(await screen.findByText('PAGE1')).toBeInTheDocument();
    const [pagination] = await screen.findAllByRole('contentinfo', { name: /pagination/i });
    const nextButton = within(pagination).getByRole('button', { name: /next/i });
    await user.click(nextButton);

    await waitFor(() => expect(screen.getByText('PAGE2')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument());
  });

  it('updates watch status via API and removes pending state', async () => {
    const user = userEvent.setup();
    renderApp('/catalog');

    const toggle = await screen.findByLabelText('Toggle watch status for AAPL');
    expect(toggle).toBeChecked();

    await user.click(toggle);

    await waitFor(() => expect(toggle).not.toBeChecked());
    const row = await screen.findByRole('row', { name: /asset row for aapl/i });
    expect(within(row).getByText(/not watching/i)).toBeInTheDocument();
  });

  it('shows the auth guard fallback on protected routes', async () => {
    resetAuthState({ isAuthenticated: false, isLoading: false });
    renderApp('/watch-list');

    expect(await screen.findByText(/redirecting to login/i)).toBeInTheDocument();
  });
});
