import type { ClientRuntimeEnv } from '../env';

type Auth0CacheLocation = 'memory' | 'localstorage';

export type Auth0Config = {
  domain: string;
  clientId: string;
  audience: string;
  redirectUri: string;
  cacheLocation: Auth0CacheLocation;
  useRefreshTokens: boolean;
};

function resolveRedirectUri(env: ClientRuntimeEnv): string {
  return env.VITE_AUTH0_REDIRECT_URI || window.location.origin;
}

function resolveCacheLocation(env: ClientRuntimeEnv): Auth0CacheLocation {
  const normalized = env.VITE_AUTH0_CACHE_LOCATION?.toLowerCase();

  if (normalized === 'localstorage') {
    console.warn('LocalStorage caching is disabled for security. Falling back to in-memory storage.');
  }

  return 'memory';
}

function resolveUseRefreshTokens(env: ClientRuntimeEnv): boolean {
  const requested = env.VITE_AUTH0_USE_REFRESH_TOKENS !== 'false';
  const isSecureOrigin = window.location.protocol === 'https:' || window.location.hostname === 'localhost';

  if (!isSecureOrigin) {
    console.warn('Refresh tokens are disabled on insecure origins to protect cookies and tokens.');
    return false;
  }

  return requested;
}

export function createAuth0Config(env: ClientRuntimeEnv): Auth0Config {
  return {
    domain: env.VITE_AUTH0_DOMAIN,
    clientId: env.VITE_AUTH0_CLIENT_ID,
    audience: env.VITE_AUTH0_AUDIENCE,
    redirectUri: resolveRedirectUri(env),
    cacheLocation: resolveCacheLocation(env),
    useRefreshTokens: resolveUseRefreshTokens(env)
  };
}
