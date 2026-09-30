// Build the static site into ./site (the only directory Cloudflare serves).
//
//   website/layout.html + partials/ + pages/  -> site/*.html
//   website/css/critical.css                  -> inlined <style> in every page (first screen)
//   website/css/site.css                      -> site/assets/build/site.<hash>.css (loaded without blocking)
//   website/js/app.mjs (+ core.mjs)           -> site/assets/build/app.<hash>.js
//   website/js/reviews.js                     -> site/assets/build/reviews.<hash>.js
//
// Hashed file names let browsers cache CSS/JS for a year; any change gets a new name.
import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const src = join(root, 'website');
const out = join(root, 'site');
const buildDir = join(out, 'assets', 'build');
const SITE = 'https://nicktechnologygroup.com/';
const target = ['chrome100', 'edge100', 'firefox100', 'safari15'];

await rm(buildDir, { recursive: true, force: true });
await mkdir(buildDir, { recursive: true });

async function bundle(entry, options = {}) {
  const result = await build({
    entryPoints: [join(src, entry)], bundle: true, minify: true, write: false,
    target, legalComments: 'none', logLevel: 'warning', ...options,
  });
  return result.outputFiles[0].text.trim();
}
async function emit(name, extension, text) {
  const file = `${name}.${createHash('sha256').update(text).digest('hex').slice(0, 10)}.${extension}`;
  await writeFile(join(buildDir, file), text);
  return `/assets/build/${file}`;
}

// Fonts and images are referenced by absolute URL and served as-is.
const css = { external: ['/assets/*'] };
const criticalCss = await bundle('css/critical.css', css);
const assets = {
  site_css: await emit('site', 'css', await bundle('css/site.css', css)),
  app_js: await emit('app', 'js', await bundle('js/app.mjs', { format: 'esm' })),
  reviews_js: await emit('reviews', 'js', await bundle('js/reviews.js', { format: 'iife' })),
};

const layout = await readFile(join(src, 'layout.html'), 'utf8');
const partials = {};
for (const file of await readdir(join(src, 'partials'))) {
  if (file.endsWith('.html')) partials[file.slice(0, -5)] = await readFile(join(src, 'partials', file), 'utf8');
}
function include(text, depth = 0) {
  if (depth > 5) throw new Error('Partial nesting is too deep');
  return text.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => {
    if (!(name in partials)) throw new Error(`Unknown partial: ${name}`);
    return include(partials[name], depth + 1);
  });
}

const pages = [];
for (const file of (await readdir(join(src, 'pages'))).sort()) {
  if (!file.endsWith('.html')) continue;
  const name = file.slice(0, -5);
  let raw = await readFile(join(src, 'pages', file), 'utf8');
  const header = raw.match(/^\s*<!--([\s\S]*?)-->/);
  const meta = {};
  if (header) {
    for (const line of header[1].trim().split(/\r?\n/)) {
      const colon = line.indexOf(':');
      if (colon >= 0) meta[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
    }
    raw = raw.slice(header[0].length);
  }
  const nav = ['cctv-installation-jamaica', 'phone-repair-jamaica', 'networking-solutions-jamaica'].includes(name) ? 'services' : name === 'index' ? 'home' : name;
  const path = name === 'index' ? '' : `${name}.html`;
  const values = {
    title: meta.title || 'Nick Technology',
    description: meta.description || '',
    page: name,
    bodyclass: meta.bodyclass || '',
    og_image: meta.og_image || 'assets/img/wall-live.webp',
    url: `${SITE}${path}`,
    year: String(new Date().getFullYear()),
    critical_css: criticalCss,
    ...assets,
  };
  let html = include(layout.replace('{{content}}', () => raw));
  html = html.replace(/\{\{active:([\w-]+)\}\}/g, (_, key) => (key === nav ? 'class="is-active" aria-current="page"' : ''));
  html = html.replace(/\{\{([\w_]+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown template value in ${file}: ${key}`);
    return values[key];
  });
  // Absolute paths keep links and assets working on nested 404 URLs.
  html = html.replace(/\b(href|src|data-src|poster|data-lb|data-preview-img|data-feed-video)="((?:assets\/|[\w-]+\.html)[^"]*)"/g, '$1="/$2"');
  html = html.replace(/srcset="([^"]*)"/g, (_, value) => `srcset="${value.replace(/(^|,\s*)(assets\/)/g, '$1/$2')}"`);
  await writeFile(join(out, file), html);
  if (!['404', 'thank-you'].includes(name)) pages.push(path);
  console.log(`Built ${file}`);
}

await writeFile(join(out, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${SITE}sitemap.xml\n`);
await writeFile(join(out, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + pages.map((path) => `  <url><loc>${SITE}${path}</loc></url>`).join('\n') + '\n</urlset>\n');

// Cloudflare static-asset headers: long caching for fingerprinted files, a week for media.
await writeFile(join(out, '_headers'), `/assets/build/*
  Cache-Control: public, max-age=31536000, immutable
/assets/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/assets/img/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=2592000
/assets/video/*
  Cache-Control: public, max-age=604800
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
`);

console.log(`Critical CSS ${(criticalCss.length / 1024).toFixed(1)} KB · ${Object.values(assets).join(' · ')}`);
