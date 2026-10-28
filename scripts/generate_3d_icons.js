import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateIcons() {
  const svgPath = path.resolve(process.cwd(), 'public', 'icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  const targets = [
    { file: 'pwa-512x512.png', size: 512 },
    { file: 'pwa-maskable-512x512.png', size: 512 },
    { file: 'pwa-192x192.png', size: 192 },
    { file: 'apple-touch-icon.png', size: 180 },
    { file: 'favicon.ico', size: 48 },
  ];

  for (const target of targets) {
    const outPath = path.resolve(process.cwd(), 'public', target.file);
    await sharp(svgBuffer)
      .resize(target.size, target.size)
      .png()
      .toFile(outPath);
    console.log(`Generated 3D icon asset: ${target.file} (${target.size}x${target.size})`);
  }

  console.log('All 3D icon assets generated successfully.');
}

generateIcons().catch(err => {
  console.error('Error generating 3D icon assets:', err);
  process.exit(1);
});
