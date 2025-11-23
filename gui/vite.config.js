import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET || env.VITE_API_BASE_URL || 'http://localhost:3000';
  const useMockAuth0 = env.VITE_AUTH0_MOCK === 'true';

  return {
    plugins: [react()],
    resolve: {
      alias: useMockAuth0
        ? {
            '@auth0/auth0-react': fileURLToPath(new URL('./src/testing/mockAuth0.tsx', import.meta.url))
          }
        : {}
    },
    build: {
      sourcemap: true
    },
    server: {
      port: Number.parseInt(env.VITE_DEV_SERVER_PORT || '5173', 10),
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false
        }
      }
    },
    preview: {
      port: Number.parseInt(env.VITE_PREVIEW_PORT || '4173', 10)
    },
    test: {
      environment: 'jsdom',
      setupFiles: './vitest.setup.js',
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.{idea,git,cache}/**',
        '**/out/**',
        '**/build/**',
        'e2e/**'
      ],
      include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}']
    }
  };
});
