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

  return normalized === 'memory' || normalized === 'localstorage' ? normalized : 'localstorage';
}

function resolveUseRefreshTokens(env: ClientRuntimeEnv): boolean {
  if (env.VITE_AUTH0_USE_REFRESH_TOKENS === undefined) {
    return true;
  }

  return env.VITE_AUTH0_USE_REFRESH_TOKENS === 'true';
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
