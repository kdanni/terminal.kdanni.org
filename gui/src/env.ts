const REQUIRED_ENV_VARS = [
  { key: 'VITE_API_BASE_URL', label: 'API base URL' },
  { key: 'VITE_AUTH0_DOMAIN', label: 'Auth0 domain' },
  { key: 'VITE_AUTH0_CLIENT_ID', label: 'Auth0 client ID' },
  { key: 'VITE_AUTH0_AUDIENCE', label: 'Auth0 API audience' },
  { key: 'VITE_PROXY_TARGET', label: 'Proxy target' }
] as const;

export type ClientRuntimeEnv = {
  VITE_API_BASE_URL: string;
  VITE_AUTH0_DOMAIN: string;
  VITE_AUTH0_CLIENT_ID: string;
  VITE_AUTH0_AUDIENCE: string;
  VITE_PROXY_TARGET: string;
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

  return sanitizedEnv as ClientRuntimeEnv;
}
