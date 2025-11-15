import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET || env.VITE_API_BASE_URL || 'http://localhost:3000';

  return {
    plugins: [react()],
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
      setupFiles: './vitest.setup.js'
    }
  };
});
