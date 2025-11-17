import { useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function useApiClient(apiBaseUrl: string) {
  const { getAccessTokenSilently, loginWithRedirect } = useAuth0();

  const fetchWithAuth = useCallback(
    async (path: string, init?: RequestInit): Promise<Response> => {
      let accessToken: string | undefined;

      try {
        accessToken = await getAccessTokenSilently();
      } catch (error) {
        await loginWithRedirect({ appState: { returnTo: window.location.pathname } });
        throw new ApiError('Authentication required. Redirecting to login.', 401);
      }

      const headers = new Headers(init?.headers ?? {});
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }

      const response = await fetch(path, {
        ...init,
        headers,
        credentials: init?.credentials ?? 'include'
      });

      if (response.status === 401) {
        await loginWithRedirect({ appState: { returnTo: window.location.pathname } });
        throw new ApiError('Your session has expired. Redirecting to login…', 401);
      }

      if (response.status === 403) {
        throw new ApiError('You do not have permission to access this resource.', 403);
      }

      return response;
    },
    [getAccessTokenSilently, loginWithRedirect]
  );

  return { fetchWithAuth };
}
