import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // Базовый путь должен совпадать с именем вашего репозитория на GitHub
    base: '/Script-Modifier/',
    define: {
      // Безопасная замена глобальных переменных
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Заменяем process.env на пустой объект, чтобы библиотеки не падали при проверке
      'process.env': {}
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});