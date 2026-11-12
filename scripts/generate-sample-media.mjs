import fs from 'fs';
import path from 'path';

const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function createEditorialSvg({ title, subtitle, category, width = 900, height = 1100, accent = '#C5A880' }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FAF7F2"/>
      <stop offset="55%" stop-color="#F3EDE2"/>
      <stop offset="100%" stop-color="#E9E0D1"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="42%" r="48%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#FAF7F2" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#glow)"/>
  <rect x="36" y="36" width="${width - 72}" height="${height - 72}" fill="none" stroke="${accent}" stroke-width="1.2" opacity="0.65"/>
  <rect x="48" y="48" width="${width - 96}" height="${height - 96}" fill="none" stroke="#1C1C1C" stroke-width="0.6" opacity="0.22"/>
  
  <!-- Classical Botanical / Architectural Arch Motif -->
  <path d="M ${width * 0.24} ${height * 0.72} L ${width * 0.24} ${height * 0.36} A ${width * 0.26} ${width * 0.26} 0 0 1 ${width * 0.76} ${height * 0.36} L ${width * 0.76} ${height * 0.72} Z" fill="none" stroke="${accent}" stroke-width="1.4" opacity="0.7"/>
  <circle cx="${width / 2}" cy="${height * 0.38}" r="${Math.min(width, height) * 0.14}" fill="none" stroke="#D4AF37" stroke-width="1" opacity="0.5"/>
  <line x1="${width * 0.35}" y1="${height * 0.56}" x2="${width * 0.65}" y2="${height * 0.56}" stroke="${accent}" stroke-width="1"/>

  <text x="${width / 2}" y="${height * 0.37}" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="#77736D" letter-spacing="5">${category.toUpperCase()}</text>
  <text x="${width / 2}" y="${height * 0.44}" text-anchor="middle" font-family="Georgia, serif" font-size="32" font-style="italic" fill="#1C1C1C">${title}</text>
  <text x="${width / 2}" y="${height * 0.61}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#77736D" letter-spacing="3">${subtitle}</text>
  <text x="${width / 2}" y="${height - 74}" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#77736D" letter-spacing="2">EDITORIAL PLACEHOLDER PHOTOGRAPH • REPLACE IN ADMIN</text>
</svg>`;
}

const assets = [
  { file: 'sample-hero-editorial.svg', title: 'Aurelia &amp; Sebastian', subtitle: 'VILLA MONTCLAIR CONSERVATORY', category: 'Editorial Hero Portrait', width: 1200, height: 1500 },
  { file: 'sample-portrait-one.svg', title: 'Aurelia Montclair', subtitle: 'THE BRIDE', category: 'Fine Art Portrait', width: 800, height: 1000 },
  { file: 'sample-portrait-two.svg', title: 'Sebastian Sterling', subtitle: 'THE GROOM', category: 'Fine Art Portrait', width: 800, height: 1000 },
  { file: 'sample-event-ceremony.svg', title: 'The Glass Orangery', subtitle: 'SACRED MARRIAGE VOWS', category: 'Ceremony Venue', width: 1000, height: 700 },
  { file: 'sample-event-reception.svg', title: 'The Grand Ballroom', subtitle: 'CANDLELIT DINNER &amp; DANCING', category: 'Reception Venue', width: 1000, height: 700 },
  { file: 'sample-event-homecoming.svg', title: 'The Heritage Pavilion', subtitle: 'LAKESIDE HOMECOMING', category: 'Homecoming Venue', width: 1000, height: 700 },
  { file: 'sample-story-1.svg', title: 'Autumn at the Archive', subtitle: 'OCTOBER 2022', category: 'Chapter I', width: 900, height: 700 },
  { file: 'sample-story-2.svg', title: 'Southern Coast Voyage', subtitle: 'AUGUST 2024', category: 'Chapter II', width: 900, height: 700 },
  { file: 'sample-story-3.svg', title: 'Mistwood EstateSunrise', subtitle: 'DECEMBER 2025', category: 'Chapter III', width: 900, height: 700 },
  { file: 'sample-gallery-1.svg', title: 'Colonnade Morning', subtitle: 'PORTRAIT STUDY I', category: 'Gallery Collection', width: 900, height: 1200 },
  { file: 'sample-gallery-2.svg', title: 'Reflecting Pool at Dusk', subtitle: 'PORTRAIT STUDY II', category: 'Gallery Collection', width: 1200, height: 850 },
  { file: 'sample-gallery-3.svg', title: 'Heirloom Gold &amp; Wax Seal', subtitle: 'EDITORIAL DETAIL III', category: 'Gallery Collection', width: 900, height: 900 },
  { file: 'sample-gallery-4.svg', title: 'Highland Olive Groves', subtitle: 'PORTRAIT STUDY IV', category: 'Gallery Collection', width: 900, height: 1200 },
  { file: 'sample-gallery-5.svg', title: 'Golden Hour Champagne', subtitle: 'PORTRAIT STUDY V', category: 'Gallery Collection', width: 1200, height: 850 },
  { file: 'sample-gallery-6.svg', title: 'The Marble Staircase', subtitle: 'PORTRAIT STUDY VI', category: 'Gallery Collection', width: 900, height: 1200 },
  { file: 'sample-party-1.svg', title: 'Lady Camille Laurent', subtitle: 'MAID OF HONOR', category: 'Wedding Party', width: 700, height: 850 },
  { file: 'sample-party-2.svg', title: 'Lord Julian Montgomery', subtitle: 'BEST MAN', category: 'Wedding Party', width: 700, height: 850 },
  { file: 'sample-party-3.svg', title: 'Sophia Wijesinghe', subtitle: 'BRIDESMAID', category: 'Wedding Party', width: 700, height: 850 },
  { file: 'sample-party-4.svg', title: 'Henrik Lindqvist', subtitle: 'GROOMSMAN', category: 'Wedding Party', width: 700, height: 850 },
  { file: 'sample-party-5.svg', title: 'Mr. &amp; Mrs. Vance-Montclair', subtitle: 'PARENTS OF THE BRIDE', category: 'Parents &amp; Hosts', width: 700, height: 850 },
  { file: 'sample-party-6.svg', title: 'Dr. &amp; Mrs. Sterling-Kensington', subtitle: 'PARENTS OF THE GROOM', category: 'Parents &amp; Hosts', width: 700, height: 850 },
];

for (const item of assets) {
  fs.writeFileSync(path.join(uploadsDir, item.file), createEditorialSvg(item), 'utf8');
}
console.log(`Generated ${assets.length} editorial SVG assets in public/uploads/`);

