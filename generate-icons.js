const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imgDir = path.join(__dirname, 'images');

const navySvg = fs.readFileSync(path.join(imgDir, 'logo-icon-navy.svg'));
const blueSvg = fs.readFileSync(path.join(imgDir, 'logo-icon-blue.svg'));
const transparentSvg = fs.readFileSync(path.join(imgDir, 'logo-icon-transparent.svg'));

async function generate() {
  // Navy background variants (primary)
  await sharp(navySvg).resize(512, 512).png().toFile(path.join(imgDir, 'logo-icon.png'));
  await sharp(navySvg).resize(96, 96).png().toFile(path.join(imgDir, 'logo-icon-small.png'));
  await sharp(navySvg).resize(180, 180).png().toFile(path.join(imgDir, 'apple-touch-icon.png'));
  await sharp(navySvg).resize(32, 32).png().toFile(path.join(imgDir, 'favicon-32.png'));
  await sharp(navySvg).resize(16, 16).png().toFile(path.join(imgDir, 'favicon-16.png'));

  // Blue background variant
  await sharp(blueSvg).resize(512, 512).png().toFile(path.join(imgDir, 'logo-icon-blue.png'));
  await sharp(blueSvg).resize(96, 96).png().toFile(path.join(imgDir, 'logo-icon-blue-small.png'));

  // Transparent background variants
  await sharp(transparentSvg).resize(512, 512).png().toFile(path.join(imgDir, 'logo-icon-transparent.png'));
  await sharp(transparentSvg).resize(96, 96).png().toFile(path.join(imgDir, 'logo-icon-transparent-small.png'));

  // SVG favicon (copy navy version)
  fs.copyFileSync(path.join(imgDir, 'logo-icon-navy.svg'), path.join(imgDir, 'favicon.svg'));

  console.log('All icons generated:');
  const files = [
    'logo-icon.png (512x512, navy bg)',
    'logo-icon-small.png (96x96, navy bg)',
    'apple-touch-icon.png (180x180, navy bg)',
    'favicon-32.png (32x32, navy bg)',
    'favicon-16.png (16x16, navy bg)',
    'favicon.svg (SVG favicon)',
    'logo-icon-blue.png (512x512, blue bg)',
    'logo-icon-blue-small.png (96x96, blue bg)',
    'logo-icon-transparent.png (512x512, transparent)',
    'logo-icon-transparent-small.png (96x96, transparent)',
  ];
  files.forEach(f => console.log('  ' + f));
}

generate().catch(err => { console.error(err); process.exit(1); });
