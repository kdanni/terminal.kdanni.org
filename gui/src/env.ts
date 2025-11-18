const REQUIRED_ENV_VARS = [
  { key: 'VITE_API_BASE_URL', label: 'API base URL' },
  { key: 'VITE_AUTH0_DOMAIN', label: 'Auth0 domain' },
  { key: 'VITE_AUTH0_CLIENT_ID', label: 'Auth0 client ID' },
  { key: 'VITE_AUTH0_AUDIENCE', label: 'Auth0 API audience' },
  { key: 'VITE_PROXY_TARGET', label: 'Proxy target' }
] as const;

const OPTIONAL_ENV_VARS = [
  'VITE_AUTH0_REDIRECT_URI',
  'VITE_AUTH0_CACHE_LOCATION',
  'VITE_AUTH0_USE_REFRESH_TOKENS'
] as const;

export type ClientRuntimeEnv = {
  VITE_API_BASE_URL: string;
  VITE_AUTH0_DOMAIN: string;
  VITE_AUTH0_CLIENT_ID: string;
  VITE_AUTH0_AUDIENCE: string;
  VITE_PROXY_TARGET: string;
  VITE_AUTH0_REDIRECT_URI?: string;
  VITE_AUTH0_CACHE_LOCATION?: string;
  VITE_AUTH0_USE_REFRESH_TOKENS?: string;
};

function normalizeUrl(value: string): string {
  return value.replace(/\/$/, '');
}

export function validateEnv(env: ImportMetaEnv): ClientRuntimeEnv {
  const errors: string[] = [];
  const sanitizedEnv: Partial<ClientRuntimeEnv> = {};

  REQUIRED_ENV_VARS.forEach(({ key, label }) => {
    const rawValue = env[key] ?? '';
    const value = typeof rawValue === 'string' ? rawValue.trim() : '';

    if (!value) {
      errors.push(`${label} (${key}) is required.`);
      return;
    }

    sanitizedEnv[key as keyof ClientRuntimeEnv] = key === 'VITE_API_BASE_URL' ? normalizeUrl(value) : value;
  });

  if (errors.length) {
    throw new Error(`Invalid environment configuration:\n${errors.join('\n')}`);
  }

  OPTIONAL_ENV_VARS.forEach((key) => {
    const rawValue = env[key];
    const value = typeof rawValue === 'string' ? rawValue.trim() : '';

    if (value) {
      sanitizedEnv[key as keyof ClientRuntimeEnv] = value;
    }
  });

  return sanitizedEnv as ClientRuntimeEnv;
}
