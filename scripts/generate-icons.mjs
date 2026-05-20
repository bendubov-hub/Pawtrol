// Generates icon-192.png and icon-512.png in /public
// Run: node scripts/generate-icons.mjs

import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size / 512; // scale factor

  // Background gradient (orange-red)
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#EF4444');
  grad.addColorStop(1, '#F97316');
  ctx.fillStyle = grad;
  // Rounded rectangle
  const r = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  // Draw paw print in white
  ctx.fillStyle = 'white';

  // Helper: draw oval
  const oval = (cx, cy, rx, ry) => {
    ctx.beginPath();
    ctx.ellipse(cx * s, cy * s, rx * s, ry * s, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  // Main pad (large)
  oval(256, 310, 95, 80);

  // Top toe pads
  oval(160, 185, 48, 58); // left
  oval(220, 155, 45, 55); // center-left
  oval(292, 155, 45, 55); // center-right
  oval(352, 185, 48, 58); // right

  return canvas.toBuffer('image/png');
}

try {
  const buf192 = drawIcon(192);
  const buf512 = drawIcon(512);
  writeFileSync(join(__dirname, '../public/icon-192.png'), buf192);
  writeFileSync(join(__dirname, '../public/icon-512.png'), buf512);
  console.log('✅ Icons generated: public/icon-192.png, public/icon-512.png');
} catch (e) {
  console.error('❌', e.message);
  console.log('\nInstall dependency first: npm install canvas');
}
