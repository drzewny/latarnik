// Generuje zestaw faviconów w stylu znaku „l.” z sekcji kontaktu (.pf-mark).
// Uruchom: npm run favicons
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const out = resolve('public');
const site = JSON.parse(readFileSync(resolve('content/site.json'), 'utf8')) as { name: string; description: string };

// Kolory .pf-mark i tła .pf-contact.
const ink = '#0b1026';
const accent = '#2457ff';
const tint = ['#edf3ff', '#eaf1ff', '#f5f8ff'];

// Obrysy Inter 800 (2048 UPM, wyciągnięte z public/fonts/inter-latin.woff2):
// „l” to prostokąt, kropka to niemal koło. Odstęp liter jak w .pf-mark: -0.065em.
const upm = 2048;
const l = { x0: 115.44, x1: 464.16, top: 1490 };
const dotOffset = 580 - 0.065 * upm; // szerokość „l” + letter-spacing
const dot = { cx: dotOffset + 361.12, cy: 165.32, rx: 188.96, ry: 186.68 };
const box = { x0: l.x0, x1: dot.cx + dot.rx, bottom: dot.cy - dot.ry, top: l.top };

type Variant = { stem: number; left?: number; top?: number; height?: number; radius: number };

// stem/height — szerokość i wysokość „l” w jednostkach viewBox 512.
// tab:  favicon w karcie; krawędzie „l” na wielokrotnościach 32, czyli na pełnych pikselach
//       przy 16, 32 i 48 px. „l” jest skrócone o ~6% względem fontu (hinting), żeby zmieścić się w siatce.
// app:  ikony 192/512 z zaokrąglonym kafelkiem, proporcje 1:1 z fontem.
// full: kafelek bez zaokrągleń — iOS i Android maskują go same; znak mieści się w bezpiecznej strefie 80%.
const variants = {
  tab: { stem: 96, left: 128, top: 64, height: 384, radius: 112 },
  app: { stem: 80, radius: 112 },
  full: { stem: 60, radius: 0 },
} satisfies Record<string, Variant>;

const r = (n: number) => Math.round(n * 100) / 100;

function svg({ stem, left, top, height: stemHeight, radius }: Variant): string {
  const k = stem / (l.x1 - l.x0);
  const width = (box.x1 - box.x0) * k;
  const height = (box.top - box.bottom) * k;
  // Domyślnie środek bboxa, przesunięty lekko w prawo — pionowa kreska jest cięższa od kropki.
  const x = left ?? (512 - width) / 2 + 6;
  const y = top ?? (512 - height) / 2;
  const lHeight = stemHeight ?? l.top * k;
  const baseline = y + lHeight;
  const px = (fx: number) => r(x + (fx - box.x0) * k);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><linearGradient id="bg" x1="0" y1=".35" x2="1" y2=".65"><stop offset="0" stop-color="${tint[0]}"/><stop offset=".55" stop-color="${tint[1]}"/><stop offset="1" stop-color="${tint[2]}"/></linearGradient></defs>
  <rect width="512" height="512"${radius ? ` rx="${radius}"` : ''} fill="url(#bg)"/>
  <rect x="${px(l.x0)}" y="${r(y)}" width="${r(stem)}" height="${r(lHeight)}" fill="${ink}"/>
  <ellipse cx="${px(dot.cx)}" cy="${r(baseline - dot.cy * k)}" rx="${r(dot.rx * k)}" ry="${r(dot.ry * k)}" fill="${accent}"/>
</svg>
`;
}

function ico(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(png.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map(({ png }) => png)]);
}

const tabSvg = svg(variants.tab);
const appSvg = svg(variants.app);
const fullSvg = svg(variants.full);
mkdirSync(out, { recursive: true });
writeFileSync(resolve(out, 'favicon.svg'), tabSvg);

const browser = await chromium.launch();
const page = await browser.newPage();
async function png(source: string, size: number): Promise<Buffer> {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${source}`);
  return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}

const icoFrames = [];
for (const size of [16, 32, 48]) icoFrames.push({ size, png: await png(tabSvg, size) });
writeFileSync(resolve(out, 'favicon.ico'), ico(icoFrames));
writeFileSync(resolve(out, 'favicon-96x96.png'), await png(tabSvg, 96));
writeFileSync(resolve(out, 'apple-touch-icon.png'), await png(fullSvg, 180));
writeFileSync(resolve(out, 'icon-192.png'), await png(appSvg, 192));
writeFileSync(resolve(out, 'icon-512.png'), await png(appSvg, 512));
writeFileSync(resolve(out, 'icon-maskable-512.png'), await png(fullSvg, 512));
await browser.close();

const manifest = {
  name: site.name,
  short_name: site.name,
  description: site.description,
  lang: 'pl',
  start_url: '/',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#ffffff',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
writeFileSync(resolve(out, 'site.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`);
const englishSite = JSON.parse(readFileSync(resolve('content/en/site.json'), 'utf8')) as { description: string };
mkdirSync(resolve(out, 'en'), { recursive: true });
writeFileSync(resolve(out, 'en/site.webmanifest'), `${JSON.stringify({ ...manifest, description: englishSite.description, lang: 'en', start_url: '/en/' }, null, 2)}\n`);
console.log('Favicony zapisane w public/.');
