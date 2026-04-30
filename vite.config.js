// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Serve the SPA at /v2/ so it co-exists with Next.js (admin panel + APIs)
  // on the same Vercel deployment. Next.js serves the build output as static
  // assets from public/v2/.
  base: '/v2/',
  // Use a v2-specific public dir so Vite doesn't recursively copy the
  // Next.js public/ tree (which contains v1's app.html, social images, etc.)
  // into public/v2/.
  publicDir: 'src/static',
  build: {
    outDir: 'public/v2',
    emptyOutDir: true,
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    exclude: ['**/._*', '**/node_modules/**', '**/.claude/**', '**/*.test.mjs'],
  },
});
