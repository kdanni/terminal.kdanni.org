import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuth0 } from '@auth0/auth0-react';
import { LoginRedirectPage } from './LoginRedirectPage';

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: vi.fn()
}));

type MockedUseAuth0 = ReturnType<typeof vi.fn>;

type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithRedirect: ReturnType<typeof vi.fn>;
};

const mockedUseAuth0 = useAuth0 as unknown as MockedUseAuth0;

function renderLoginRoute(authState: AuthState): ReturnType<typeof render> {
  mockedUseAuth0.mockReturnValue(authState);

  return render(
    <MemoryRouter initialEntries={[`/login`]}>
      <Routes>
        <Route path="/login" element={<LoginRedirectPage />} />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('LoginRedirectPage', () => {
  it('does not attempt login while Auth0 SDK is still loading', () => {
    const loginWithRedirect = vi.fn();

    renderLoginRoute({
      isAuthenticated: false,
      isLoading: true,
      loginWithRedirect
    });

    expect(loginWithRedirect).not.toHaveBeenCalled();
  });

  it('triggers login after loading finishes and only once', async () => {
    const loginWithRedirect = vi.fn();
    const authState: AuthState = {
      isAuthenticated: false,
      isLoading: true,
      loginWithRedirect
    };

    mockedUseAuth0.mockImplementation(() => authState);

    const view = render(
      <MemoryRouter initialEntries={[`/login`]}>
        <Routes>
          <Route path="/login" element={<LoginRedirectPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(loginWithRedirect).not.toHaveBeenCalled();

    act(() => {
      authState.isLoading = false;
      view.rerender(
        <MemoryRouter initialEntries={[`/login`]}>
          <Routes>
            <Route path="/login" element={<LoginRedirectPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitFor(() => expect(loginWithRedirect).toHaveBeenCalledTimes(1));
    expect(loginWithRedirect).toHaveBeenCalledWith({ appState: { returnTo: '/catalog' } });

    view.rerender(
      <MemoryRouter initialEntries={[`/login`]}>
        <Routes>
          <Route path="/login" element={<LoginRedirectPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(loginWithRedirect).toHaveBeenCalledTimes(1));
  });
});
