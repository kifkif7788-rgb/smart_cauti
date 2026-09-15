/** Regenerate all app icons from the editable SVG master. Run: node scripts/generate-icons.mjs */
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const svg = await readFile(new URL('src/app/icon.svg', root), 'utf8');
const png = (source, size) => sharp(Buffer.from(source)).resize(size, size).png().toBuffer();

for (const size of [192, 512]) {
  await writeFile(new URL(`public/icon-${size}.png`, root), await png(svg, size));
}
await writeFile(new URL('src/app/apple-icon.png', root), await png(svg, 180));

// The opaque background fills every crop; the smaller mark stays in the maskable safe circle.
const maskable = svg.replace('rx="14"', 'rx="0"')
  .replace('<g id="mark">', '<g id="mark" transform="translate(6.4 6.4) scale(.8)">');
await writeFile(new URL('public/icon-maskable-512.png', root), await png(maskable, 512));

// ICO container with three PNG frames for browser and desktop favicon sizes.
const sizes = [16, 32, 48];
const frames = await Promise.all(sizes.map(size => png(svg, size)));
const header = Buffer.alloc(6 + frames.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frames.length, 4);
let offset = header.length;
frames.forEach((frame, i) => {
  const entry = 6 + i * 16;
  header[entry] = sizes[i];
  header[entry + 1] = sizes[i];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(frame.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
await writeFile(new URL('src/app/favicon.ico', root), Buffer.concat([header, ...frames]));
console.log('Generated favicon (16/32/48), Apple icon (180), PWA icons (192/512), and maskable icon (512).');
