// scripts/generate-icons.mjs
// Generates icon-192.png and icon-512.png for the PWA manifest
// Run once with: node scripts/generate-icons.mjs

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dir, '../public/favicon.svg');
const svgBuffer = readFileSync(svgPath);

const sizes = [192, 512];

for (const size of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(join(__dir, `../public/icon-${size}.png`));
  console.log(`✓ Generated public/icon-${size}.png`);
}

console.log('Done!');
