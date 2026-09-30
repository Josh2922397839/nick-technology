// Checks the built site in ./site. Run `npm run build` first.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';

const site = new URL('../site/', import.meta.url);
const pages = (await readdir(site)).filter((file) => file.endsWith('.html'));
const read = (file) => readFile(new URL(file, site), 'utf8');
const exists = (path) => stat(new URL(`.${path}`, site)).then(() => true, () => false);

test('every page offers a call and the sticky call dock', async () => {
  assert.ok(pages.length >= 12, 'all pages are built');
  for (const page of pages) {
    const html = await read(page);
    assert.match(html, /href="tel:\+18764655975"/, `${page}: call link`);
    assert.match(html, /class="dock"/, `${page}: sticky call dock`);
    assert.doesNotMatch(html, /\{\{\s*[>\w:-]+\s*\}\}/, `${page}: unresolved template tag`);
  }
});

test('pages are fast by construction: inlined first-screen CSS, no render-blocking third parties', async () => {
  for (const page of pages) {
    const html = await read(page);
    const head = html.slice(0, html.indexOf('</head>'));
    assert.match(head, /<style>[\s\S]{5000,}<\/style>/, `${page}: first-screen CSS is inlined`);
    assert.doesNotMatch(head, /<link rel="stylesheet" href="[^"]+">(?!<\/noscript>)/, `${page}: no render-blocking stylesheet`);
    assert.doesNotMatch(html, /fonts\.googleapis|gsap|lenis|ScrollTrigger|SplitText|start\.js/i, `${page}: old motion stack removed`);
    assert.match(head, /<script type="module" src="\/assets\/build\/app\.[0-9a-f]{10}\.js">/, `${page}: fingerprinted module script`);
  }
});

test('every local file a page references exists', async () => {
  const missing = new Set();
  for (const page of pages) {
    const html = await read(page);
    const urls = [...html.matchAll(/(?:href|src|poster|data-src|data-lb|data-preview-img|data-feed-video)="(\/[^"#?]*)"/g)].map((m) => m[1]);
    for (const [, set] of html.matchAll(/srcset="([^"]*)"/g)) urls.push(...set.split(',').map((part) => part.trim().split(/\s+/)[0]));
    for (const url of urls) {
      const path = url === '/' ? '/index.html' : url;
      if (!(await exists(path))) missing.add(`${page} -> ${url}`);
    }
  }
  assert.deepEqual([...missing], []);
});

test('the homepage leads with a call button before any section', async () => {
  const html = await read('index.html');
  const main = html.indexOf('<main');
  const call = html.indexOf('href="tel:+18764655975"', main);
  assert.ok(call > main && call < html.indexOf('<h2', main), 'the first call button comes before the first section heading');
  assert.match(html, /data-hero-cta/, 'the dock knows when the hero button scrolls away');
});

test('fingerprinted assets are cached long-term and stay small', async () => {
  const headers = await read('_headers');
  assert.match(headers, /\/assets\/build\/\*\s+Cache-Control: public, max-age=31536000, immutable/);
  const build = new URL('assets/build/', site);
  for (const file of await readdir(build)) {
    const { size } = await stat(new URL(file, build));
    const budget = file.endsWith('.css') ? 90_000 : 30_000;
    assert.ok(size < budget, `${file} is ${size} bytes (budget ${budget})`);
  }
});
