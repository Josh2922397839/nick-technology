import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const src = join(root, 'website');
const out = join(root, 'site');
await mkdir(out, { recursive: true });
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
  const values = { title: meta.title || 'Nick Technology', description: meta.description || '', page: name, bodyclass: meta.bodyclass || '', og_image: meta.og_image || 'assets/img/wall-live.webp', url: `https://nicktechnologygroup.com/${path}` };
  let html = include(layout.replace('{{content}}', raw));
  html = html.replace(/\{\{active:([\w-]+)\}\}/g, (_, key) => key === nav ? 'class="is-active" aria-current="page"' : '');
  html = html.replace(/\{\{([\w_]+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown template value: ${key}`);
    return values[key];
  });
  // Keep navigation and assets working even on nested 404 URLs.
  html = html.replace(/\b(href|src|poster)="((?:assets\/|[\w-]+\.html)[^"]*)"/g, '$1="/$2"');
  html = html.replace(/srcset="([^"]*)"/g, (_, value) => `srcset="${value.replace(/(^|,\s*)(assets\/)/g, '$1/$2')}"`);
  await writeFile(join(out, file), html);
  if (!['404', 'thank-you'].includes(name)) pages.push(path);
  console.log(`Built ${file}`);
}
await writeFile(join(out, 'robots.txt'), 'User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://nicktechnologygroup.com/sitemap.xml\n');
await writeFile(join(out, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + pages.map(path => `  <url><loc>https://nicktechnologygroup.com/${path}</loc></url>`).join('\n') + '\n</urlset>\n');
