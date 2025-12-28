// Script simple para generar iconos PWA
// Ejecutar con: node generate-icons.js

import { writeFileSync } from 'fs';

const sizes = [192, 512];
const color = '#13ec5b';

// Crear SVG base
function createSVG(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${color}" rx="${size * 0.15}"/>
  <text
    x="50%"
    y="50%"
    dominant-baseline="middle"
    text-anchor="middle"
    font-size="${size * 0.5}"
    font-weight="bold"
    fill="white"
    font-family="Arial, sans-serif">
    CS
  </text>
</svg>`;
}

// Generar los SVG temporales
sizes.forEach(size => {
  const svg = createSVG(size);
  writeFileSync(`public/pwa-${size}x${size}.svg`, svg);
  console.log(`Creado: pwa-${size}x${size}.svg`);
});

// Crear apple-touch-icon
const appleTouchIcon = createSVG(180);
writeFileSync('public/apple-touch-icon.png.svg', appleTouchIcon);
console.log('Creado: apple-touch-icon.png.svg');

console.log('\n✅ Iconos SVG creados exitosamente!');
console.log('⚠️  NOTA: Los iconos son SVG temporales. Para producción, convierte a PNG:');
console.log('   - Usa una herramienta online como https://cloudconvert.com/svg-to-png');
console.log('   - O instala ImageMagick: brew install imagemagick');
console.log('   - Luego ejecuta: for i in 192 512; do convert public/pwa-${i}x${i}.svg public/pwa-${i}x${i}.png; done\n');
