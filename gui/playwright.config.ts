import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    headless: true
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'npm run dev -- --host --port 4173',
    cwd: __dirname,
    env: {
      VITE_API_BASE_URL: 'http://localhost:3000',
      VITE_PROXY_TARGET: 'http://localhost:3000',
      VITE_AUTH0_DOMAIN: 'mock',
      VITE_AUTH0_CLIENT_ID: 'mock-client',
      VITE_AUTH0_AUDIENCE: 'mock-audience',
      VITE_USE_MSW: 'true',
      VITE_AUTH0_MOCK: 'true'
    },
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120_000
  }
});
