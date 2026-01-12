import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  // Опрелеляем, является ли это сборкой специально для GitHub Pages
  const isGhPages = mode === 'gh-pages';

  return {
    plugins: [react()],
    // Если режим gh-pages, используем имя репозитория. В противном случае (Netlify/Local) используем корень.
    base: isGhPages ? '/Script-Modifier/' : '/',
    resolve: {
      alias: {
        '@': path.resolve((process as any).cwd(), '.')
      }
    },
    define: {
      // Безопасная замена глобальных переменных
      // Ensure API_KEY is passed if available, otherwise it stays undefined to allow client-side handling
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});