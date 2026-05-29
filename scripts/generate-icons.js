// Generates PWA icons using Node.js canvas
// Run: node scripts/generate-icons.js
import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');

mkdirSync(outDir, { recursive: true });

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, size, size);

  // Border
  const borderWidth = Math.round(size * 0.03);
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(borderWidth / 2, borderWidth / 2, size - borderWidth, size - borderWidth);

  // Text — "ITP" in white
  const fontSize = Math.round(size * 0.32);
  ctx.fillStyle = '#e8e8f0';
  ctx.font = `800 ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ITP', size / 2, size / 2);

  // Sub-label
  const subSize = Math.round(size * 0.1);
  ctx.fillStyle = '#6366f1';
  ctx.font = `700 ${subSize}px sans-serif`;
  ctx.fillText('OPERATOR', size / 2, size * 0.7);

  return canvas.toBuffer('image/png');
}

try {
  writeFileSync(join(outDir, 'icon-192.png'), generateIcon(192));
  console.log('Generated icon-192.png');

  writeFileSync(join(outDir, 'icon-512.png'), generateIcon(512));
  console.log('Generated icon-512.png');
} catch (e) {
  console.error('canvas package not available, creating placeholder icons instead');
  // Fallback: create minimal 1x1 PNG placeholders
  // (vite-plugin-pwa will still build; icons won't display correctly)
  const PLACEHOLDER_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  writeFileSync(join(outDir, 'icon-192.png'), PLACEHOLDER_PNG);
  writeFileSync(join(outDir, 'icon-512.png'), PLACEHOLDER_PNG);
  console.log('Created placeholder icons (install canvas package for real icons)');
}
