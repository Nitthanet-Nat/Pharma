import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const difyTarget = (env.DIFY_TARGET || 'https://dify2.nrct.ai.in.th').replace(/\/+$/, '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/dify/chat': {
            target: difyTarget,
            changeOrigin: true,
            rewrite: () => '/v1/chat-messages',
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
