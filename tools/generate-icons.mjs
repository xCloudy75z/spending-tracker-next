import path from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';
import sharp from 'sharp';

const root = process.cwd();
const source = path.join(root, 'site', 'app', 'assets', 'brand', 'mark.svg');
const output = path.join(root, 'site', 'app', 'assets', 'icons');
await mkdir(output, { recursive: true });
const svg = await readFile(source);

for (const size of [180, 192, 512]) {
  await sharp(svg).resize(size, size).png().toFile(path.join(output, `icon-${size}.png`));
}
await sharp(svg).resize(410, 410).extend({ top: 51, bottom: 51, left: 51, right: 51, background: '#24766B' }).png().toFile(path.join(output, 'icon-512-maskable.png'));

const sizes = [32, 60, 120, 180];
let left = 24;
const tiles = [];
for (const size of sizes) {
  tiles.push({ input: await sharp(svg).resize(size, size).png().toBuffer(), left, top: 24 });
  left += size + 24;
}
await sharp({ create: { width: left, height: 228, channels: 4, background: '#FFFFFF' } }).composite(tiles).png().toFile(path.join(output, 'icon-contact-sheet.png'));

for (const [filename, size] of [['icon-180.png', 180], ['icon-192.png', 192], ['icon-512.png', 512], ['icon-512-maskable.png', 512]]) {
  const metadata = await sharp(path.join(output, filename)).metadata();
  if (metadata.width !== size || metadata.height !== size || metadata.channels !== 4) throw new Error(`Invalid ${filename}`);
}
console.log('Generated and validated Spending Tracker icon family.');
