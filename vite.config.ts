import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const rawDifyTarget = (env.DIFY_BASE_URL || env.DIFY_TARGET || 'https://dify2.nrct.ai.in.th/v1').replace(/\/+$/, '');
    // Vite proxy target should be origin-like; API version path is handled by `rewrite`.
    const difyTarget = rawDifyTarget.replace(/\/v1$/i, '');
    const difyRoute = '/v1/workflows/run';
    return {
      build: {
        emptyOutDir: true,
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/dify/chat': {
            target: difyTarget,
            changeOrigin: true,
            rewrite: () => difyRoute,
            headers: env.DIFY_API_KEY
              ? {
                  Authorization: `Bearer ${env.DIFY_API_KEY}`,
                }
              : undefined,
          },
        },
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
