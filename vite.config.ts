import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    base: './', // Обязательно для Electron (протокол file://)
    resolve: {
      alias: {
        '@': path.resolve((process as any).cwd(), '.')
      }
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    },
    server: {
      port: 5173,
      strictPort: true
    }
  };
});