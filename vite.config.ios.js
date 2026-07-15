// vite.config.ios.js
// Dedicated iOS build target. Extends the base web config but ships a
// SELF-CONTAINED bundle for the Capacitor WKWebView shell:
//   - base: './'  → relative asset URLs (no /app/ prefix; served from file://)
//   - build.outDir: 'dist-ios'  → dedicated output, never touches public/app
// The web build (vite.config.js) MUST stay byte-identical — do not edit that file.
import { defineConfig, mergeConfig } from 'vite';
import baseConfig from './vite.config.js';

export default mergeConfig(
  baseConfig,
  defineConfig({
    base: './',
    build: {
      outDir: 'dist-ios',
    },
  })
);
