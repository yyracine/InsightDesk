import fs from 'fs';
import path from 'path';

const iconsDir = path.resolve('src-tauri', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1x1 transparent PNG header + IHDR + IDAT + IEND or a simple valid PNG
// Let's create a valid minimal 32x32 and 128x128 PNG buffer
// Minimal valid 1x1 32-bit RGBA PNG buffer (blue/violet primary #3B82F6)
const minimalPngBase64 = 
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAA' +
  'K0lEQVRYR+3QQREAAAzCQPo3vSM8dAgk2XqfAwAAgJcFXk1k' +
  'gUeBR4FHgUeBR4EbgUcA/W0hW51J6LIAAAAASUVORK5CYII=';

const pngBuffer = Buffer.from(minimalPngBase64, 'base64');

// Write PNG files
fs.writeFileSync(path.join(iconsDir, '32x32.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, '128x128.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, 'icon.icns'), pngBuffer);

// Construct a valid ICO file embedding this PNG
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // type 1 = icon
icoHeader.writeUInt16LE(1, 4); // count 1

const icoEntry = Buffer.alloc(16);
icoEntry.writeUInt8(32, 0); // width 32
icoEntry.writeUInt8(32, 1); // height 32
icoEntry.writeUInt8(0, 2);  // color count
icoEntry.writeUInt8(0, 3);  // reserved
icoEntry.writeUInt16LE(1, 4);  // planes
icoEntry.writeUInt16LE(32, 6); // bpp
icoEntry.writeUInt32LE(pngBuffer.length, 8); // size
icoEntry.writeUInt32LE(22, 12); // offset (6 + 16 = 22)

const icoFile = Buffer.concat([icoHeader, icoEntry, pngBuffer]);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoFile);

console.log('Icons generated successfully in', iconsDir);
