// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    exclude: ['**/._*', '**/node_modules/**', '**/.claude/**', '**/*.test.mjs'],
  },
});
