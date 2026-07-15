#!/usr/bin/env node
/**
 * ios-icons.mjs
 * Generates the iOS AppIcon (1024x1024, opaque) and the LaunchScreen
 * storyboard's centered gold-A monogram (Splash.imageset, transparent,
 * @1x/@2x/@3x) from public/icon.svg — the same SVG the web build already
 * uses for its favicon/apple-touch-icon, so the brand mark can't drift
 * between the web and native builds.
 *
 * iOS P1 Task 4 (Premium Contract items 1 + 12-partial: boot-flash kill +
 * app icon).
 *
 * Usage:
 *   node scripts/ios-icons.mjs
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const ICON_SVG = join(ROOT, 'public/icon.svg');
const APPICON_DIR = join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset');
const SPLASH_DIR = join(ROOT, 'ios/App/App/Assets.xcassets/Splash.imageset');

// Everything in the boot-flash chain (LaunchScreen.storyboard's background,
// capacitor.config.json's ios.backgroundColor, index.html's pre-CSS <html>/
// <body> style) is this exact shell dark — the app icon's flatten color
// matches too, so there's no seam between the rounded rect's transparent
// corners and whatever they get composited onto.
const SHELL_BG = '#0A0A0C';

// AppIcon.appiconset's existing Contents.json already uses the modern
// Xcode 14+ single-size "universal" 1024x1024 format (Xcode derives every
// other size — Settings, Spotlight, notification, etc. — from this one
// master at build/export time), so this script only needs to produce that
// one file, matching the filename already in Contents.json.
const APPICON_FILE = 'AppIcon-512@2x.png';
const APPICON_SIZE = 1024;

// LaunchScreen storyboard's centered monogram — ~120pt per the brief, at
// the standard 1x/2x/3x scale steps.
const SPLASH_SIZES = [
  { file: 'splash-logo.png', scale: '1x', size: 120 },
  { file: 'splash-logo@2x.png', scale: '2x', size: 240 },
  { file: 'splash-logo@3x.png', scale: '3x', size: 360 },
];

// ---------------------------------------------------------------------------
// Source SVG
// ---------------------------------------------------------------------------
const svgSource = readFileSync(ICON_SVG, 'utf8');

// The monogram-only variant strips the background <rect>, leaving just the
// gold "A" <text> glyph on a transparent canvas. Same viewBox/coordinates
// as the full icon, so the glyph's position and proportions are identical
// to the app icon — it just has no background square of its own, because
// the storyboard supplies the background as a solid native UIView color.
const rectMatch = svgSource.match(/<rect[^>]*\/>/);
if (!rectMatch) {
  throw new Error(
    `ios-icons: expected a single <rect .../> background element in ${ICON_SVG} — ` +
      `icon.svg's markup changed shape, update this script's monogram-extraction regex.`
  );
}
const monogramSvg = svgSource.replace(rectMatch[0], '');

// ---------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------
async function buildAppIcon() {
  const outPath = join(APPICON_DIR, APPICON_FILE);
  await sharp(Buffer.from(svgSource))
    .resize(APPICON_SIZE, APPICON_SIZE)
    // App Store rejects alpha on the 1024 marketing icon — flatten the
    // rounded rect's transparent corner slivers onto the shell dark so the
    // output is fully opaque.
    .flatten({ background: SHELL_BG })
    .png()
    .toFile(outPath);
  console.log(`  AppIcon: ${outPath} (${APPICON_SIZE}x${APPICON_SIZE}, opaque)`);
}

async function buildSplashLogo() {
  for (const { file, scale, size } of SPLASH_SIZES) {
    const outPath = join(SPLASH_DIR, file);
    await sharp(Buffer.from(monogramSvg)).resize(size, size).png().toFile(outPath);
    console.log(`  Splash ${scale}: ${outPath} (${size}x${size}, transparent)`);
  }
}

async function main() {
  console.log('ios-icons: rasterizing', ICON_SVG);
  await buildAppIcon();
  await buildSplashLogo();
  console.log('ios-icons: done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
