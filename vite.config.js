// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/app/',
  publicDir: 'src/static',
  build: {
    outDir: 'public/app',
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    exclude: [
      '**/._*',
      '**/node_modules/**',
      '**/.claude/**',              // local worktrees/harness files — never part of the suite
      'lib/reorderDuration.test.mjs', // node-runner script (run via `node lib/reorderDuration.test.mjs`), not vitest
      'lib/news/**',                  // node-runner scripts (run via `node lib/news/rss.test.mjs`), not vitest
      // NOTE: lib/businessCard.test.mjs is a real vitest suite — do NOT exclude it.
    ],
  },
});
