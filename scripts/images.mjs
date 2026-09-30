// One-off image optimiser: `npm run images`.
// Produces small, pre-cropped variants so phones never download more pixels than they show.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { stat } from 'node:fs/promises';

const img = fileURLToPath(new URL('../site/assets/img/', import.meta.url));

// Hero "camera feed" tiles render at 4:3 and never wider than ~220px, so 400x300 covers 2x screens.
// Most crops use sharp's attention detection; a few need the subject pinned.
const feeds = [
  'wall-coast', 'wall-live', ['install-pole', 'north'], 'nicholas-shop', 'install-camera',
  ['install-ladder', 'northeast'], 'on-site', 'forza-titan-700', 'solar-panel', 'wall-mounted',
];

// Tall tiles and cards that were previously served at full size.
const medium = [
  ['install-pole', 480],
  ['install-ladder', 600],
  ['install-camera', 600],
  ['nicholas-shop', 480],
];

async function write(pipeline, name, quality = 72) {
  const file = join(img, name);
  await pipeline.webp({ quality, effort: 6 }).toFile(file);
  console.log(`${name.padEnd(32)} ${((await stat(file)).size / 1024).toFixed(1)} KB`);
}

for (const entry of feeds) {
  const [name, position = sharp.strategy.attention] = [].concat(entry);
  // Feed tiles sit under a scanline overlay, so a lower quality is invisible.
  await write(sharp(join(img, `${name}.webp`)).resize(400, 300, { fit: 'cover', position }), `${name}-feed.webp`, 60);
}
for (const [name, width] of medium) {
  await write(sharp(join(img, `${name}.webp`)).resize({ width, withoutEnlargement: true }), `${name}-md.webp`);
}
