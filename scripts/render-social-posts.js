#!/usr/bin/env node
/**
 * render-social-posts.js
 * Renders advnce labs social post templates to 1080x1080 PNGs
 * via Chrome headless (no puppeteer — uses system Chrome directly).
 *
 * Usage:
 *   node scripts/render-social-posts.js              # render all posts
 *   node scripts/render-social-posts.js --post-id bpc157-compound  # render one
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TEMPLATES = path.join(__dirname, '..', 'templates', 'social');
const OUT_DIR = path.join(__dirname, '..', 'public', 'social-images');
const MANIFEST = path.join(__dirname, '..', 'data', 'social-posts-manifest.json');
const TMP_DIR = '/tmp/advnce-render';

// ---------------------------------------------------------------------------
// Carousel: number of slides per stack_carousel post
// ---------------------------------------------------------------------------
const CAROUSEL_SLIDES = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Replace all {{KEY}} tokens in template with values from vars object */
function applyVars(html, vars) {
  return html.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, key) => {
    return key in vars ? vars[key] : match;
  });
}

/**
 * Flatten compound arrays for stack_carousel.
 * vars.COMPOUNDS = [{name, role, explainer}, ...]
 * Produces COMPOUND_1_NAME, COMPOUND_1_ROLE, etc.
 */
function flattenCarouselVars(vars) {
  const flat = Object.assign({}, vars);
  if (Array.isArray(vars.COMPOUNDS)) {
    vars.COMPOUNDS.forEach((c, i) => {
      const n = i + 1;
      flat[`COMPOUND_${n}_NAME`] = c.name || '';
      flat[`COMPOUND_${n}_ROLE`] = c.role || '';
      flat[`COMPOUND_${n}_EXPLAINER`] = c.explainer || '';
    });
  }
  return flat;
}

/** Write HTML to a tmp file and return its file:// URL */
function writeTmp(filename, html) {
  ensureDir(TMP_DIR);
  const tmpPath = path.join(TMP_DIR, filename);
  fs.writeFileSync(tmpPath, html, 'utf8');
  return `file://${tmpPath}`;
}

/** Run Chrome headless screenshot. Returns true on success. */
function runChrome(fileUrl, outPng) {
  const cmd = [
    `"${CHROME}"`,
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    '--window-size=1080,1080',
    `--screenshot="${outPng}"`,
    `"${fileUrl}"`,
  ].join(' ');

  try {
    execSync(cmd, { stdio: 'pipe', timeout: 30000 });
    return fs.existsSync(outPng);
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : '';
    // Chrome exits non-zero but still writes the screenshot — check file
    if (fs.existsSync(outPng)) return true;
    console.error(`  Chrome error: ${stderr.slice(0, 200)}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Render functions
// ---------------------------------------------------------------------------
function renderSingle(post) {
  const { id, post_type, output_filename, vars } = post;
  const templatePath = path.join(TEMPLATES, `${post_type}.html`);

  if (!fs.existsSync(templatePath)) {
    console.error(`  [SKIP] Template not found: ${post_type}.html`);
    return { success: false, reason: 'template_missing' };
  }

  const raw = fs.readFileSync(templatePath, 'utf8');
  const html = applyVars(raw, vars || {});
  const tmpUrl = writeTmp(`${id}.html`, html);
  const outPng = path.join(OUT_DIR, output_filename);

  process.stdout.write(`  Rendering ${output_filename} ... `);
  const ok = runChrome(tmpUrl, outPng);
  if (ok) {
    const size = fs.statSync(outPng).size;
    console.log(`OK (${(size / 1024).toFixed(1)} KB)`);
  } else {
    console.log('FAILED');
  }
  return { success: ok };
}

function renderCarousel(post) {
  const { id, post_type, output_filename, vars } = post;
  const templatePath = path.join(TEMPLATES, `${post_type}.html`);

  if (!fs.existsSync(templatePath)) {
    console.error(`  [SKIP] Template not found: ${post_type}.html`);
    return { success: false, total: 0, failed: CAROUSEL_SLIDES };
  }

  const raw = fs.readFileSync(templatePath, 'utf8');
  const flatVars = flattenCarouselVars(vars || {});
  const html = applyVars(raw, flatVars);

  // Base output filename (strip extension, add slide number)
  const base = output_filename.replace(/\.png$/i, '');
  let failed = 0;

  for (let slide = 1; slide <= CAROUSEL_SLIDES; slide++) {
    const tmpFilename = `${id}-slide${slide}.html`;
    // Inject slide param in a way the template JS picks up
    const slideHtml = html + `<script>
      document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('.slide').forEach(function(s) { s.style.display = 'none'; });
        var t = document.getElementById('slide-${slide}');
        if (t) t.style.display = 'flex';
      });
    </script>`;

    const tmpUrl = writeTmp(tmpFilename, slideHtml);
    const outPng = path.join(OUT_DIR, `${base}-${slide}.png`);

    process.stdout.write(`  Rendering ${base}-${slide}.png ... `);
    const ok = runChrome(tmpUrl, outPng);
    if (ok) {
      const size = fs.statSync(outPng).size;
      console.log(`OK (${(size / 1024).toFixed(1)} KB)`);
    } else {
      console.log('FAILED');
      failed++;
    }
  }

  return {
    success: failed === 0,
    total: CAROUSEL_SLIDES,
    failed,
  };
}

function renderPost(post) {
  if (post.post_type === 'stack_carousel') return renderCarousel(post);
  return renderSingle(post);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  // Parse args
  const args = process.argv.slice(2);
  let filterPostId = null;
  const pidIdx = args.indexOf('--post-id');
  if (pidIdx !== -1 && args[pidIdx + 1]) {
    filterPostId = args[pidIdx + 1];
  }

  // Read manifest
  if (!fs.existsSync(MANIFEST)) {
    console.error(`Manifest not found: ${MANIFEST}`);
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  if (!Array.isArray(manifest)) {
    console.error('Manifest must be a JSON array');
    process.exit(1);
  }

  const posts = filterPostId
    ? manifest.filter((p) => p.id === filterPostId)
    : manifest;

  if (posts.length === 0) {
    console.error(filterPostId ? `Post not found: ${filterPostId}` : 'Manifest is empty');
    process.exit(1);
  }

  // Check Chrome exists
  if (!fs.existsSync(CHROME)) {
    console.error(`Chrome not found at: ${CHROME}`);
    console.error('Install Google Chrome or update CHROME path in script.');
    process.exit(1);
  }

  ensureDir(OUT_DIR);

  console.log(`\nadvnce labs — social image renderer`);
  console.log(`Output: ${OUT_DIR}`);
  console.log(`Posts to render: ${posts.length}\n`);

  let successCount = 0;
  let failCount = 0;

  posts.forEach((post) => {
    console.log(`[${post.id}] (${post.post_type})`);
    const result = renderPost(post);
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
  });

  console.log(`\n--- Done ---`);
  console.log(`Success: ${successCount}  Failed: ${failCount}`);
  if (failCount > 0) process.exit(1);
}

main();
