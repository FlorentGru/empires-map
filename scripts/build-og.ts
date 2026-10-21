// Images de partage (Open Graph, 1200×630) et icônes du site, rendues par le Chromium de Playwright.
//   public/og/<empire>.png : silhouette du territoire à l'apogée (couleur de l'empire) sur les terres, emblème,
//                            nom et dates ; public/og/atlas.png : les apogées de tous les empires (accueil).
//   public/favicon.svg, apple-touch-icon.png (180), icon-192.png, icon-512.png.
// À relancer après l'ajout d'un empire (images commitées) : npm run build:og
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import type { FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson';
import { EMBLEMS } from '../src/empires/emblems.ts';
import { apogeeStepId } from '../src/lib/apogee.ts';
import { formatYear } from '../src/lib/years.ts';
import { SITE_NAME } from '../src/lib/seo.ts';
import type { Empire, EmpireStats, TerritoryProperties } from '../src/types.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'og');
const INK = '#2b2219';
const PARCHMENT = '#f4ead3';
const GOLD = '#e0b43a';

type Geo = FeatureCollection<Polygon | MultiPolygon, TerritoryProperties>;
const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;

/* ---------- Projection (Web Mercator) et tracés SVG ---------- */

const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (Math.max(-85, Math.min(85, lat)) * Math.PI) / 360));
type BBox = [number, number, number, number]; // ouest, sud, est, nord

const polysOf = (g: Polygon | MultiPolygon): Position[][][] => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);

function bboxOf(fcs: Geo[]): BBox {
  const b: BBox = [180, 90, -180, -90];
  for (const fc of fcs)
    for (const f of fc.features)
      if (f.properties?.status !== 'allied')
        for (const poly of polysOf(f.geometry))
          for (const [x, y] of poly[0]!) {
            b[0] = Math.min(b[0], x!);
            b[1] = Math.min(b[1], y!);
            b[2] = Math.max(b[2], x!);
            b[3] = Math.max(b[3], y!);
          }
  return b;
}

/** Projection qui fait tenir `bbox` (avec une marge) dans un cadre w×h, en gardant les proportions. */
function fit(bbox: BBox, w: number, h: number, margin = 0.12) {
  const [x0, x1] = [bbox[0], bbox[2]];
  const [y0, y1] = [mercY(bbox[1]), mercY(bbox[3])];
  const dx = ((x1 - x0) * Math.PI) / 180;
  const dy = y1 - y0;
  const k = Math.min((w * (1 - 2 * margin)) / dx, (h * (1 - 2 * margin)) / dy);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const project = ([lon, lat]: Position): [number, number] => [w / 2 + (((lon! - cx) * Math.PI) / 180) * k, h / 2 - (mercY(lat!) - cy) * k];
  // Étendue géographique visible (pour ne garder que les terres utiles).
  const view: BBox = [cx - ((w / 2 / k) * 180) / Math.PI, -85, cx + ((w / 2 / k) * 180) / Math.PI, 85];
  return { project, view };
}

function pathD(polys: Position[][][], project: (p: Position) => [number, number]): string {
  let d = '';
  for (const poly of polys)
    for (const ring of poly) {
      let prev = '';
      ring.forEach((p, i) => {
        const [x, y] = project(p);
        const pt = `${x.toFixed(1)},${y.toFixed(1)}`;
        if (pt === prev) return;
        d += `${i === 0 ? 'M' : 'L'}${pt}`;
        prev = pt;
      });
      d += 'Z';
    }
  return d;
}

const land = readJson<FeatureCollection<Polygon | MultiPolygon>>(path.join(ROOT, 'public', 'data', 'basemap', 'land.geojson'));

function mapSvg(w: number, h: number, layers: { fc: Geo; color: string }[], bbox: BBox, margin?: number): string {
  const { project, view } = fit(bbox, w, h, margin);
  const landD = land.features
    .flatMap((f) => polysOf(f.geometry))
    .filter((poly) => poly[0]!.some(([x]) => x! >= view[0] - 30 && x! <= view[2] + 30))
    .map((poly) => pathD([poly], project))
    .join('');
  const terr = layers
    .map(({ fc, color }) =>
      fc.features
        .filter((f) => f.properties?.status !== 'allied')
        .map(
          (f) =>
            `<path d="${pathD(polysOf(f.geometry), project)}" fill="${color}" fill-opacity="${f.properties?.status === 'vassal' ? 0.4 : 0.78}" stroke="${INK}" stroke-opacity="0.55" stroke-width="1.2" stroke-linejoin="round" fill-rule="evenodd"/>`,
        )
        .join(''),
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#bcd0d6"/><path d="${landD}" fill="#efe2c2" stroke="#b9a37a" stroke-width="0.8" fill-rule="evenodd"/>${terr}</svg>`;
}

/* ---------- Données ---------- */

const empires: Empire[] = fs
  .readdirSync(path.join(ROOT, 'data', 'empires'))
  .filter((id) => !id.startsWith('_') && fs.existsSync(path.join(ROOT, 'data', 'empires', id, 'timeline.json')))
  .map((id) => {
    const e = readJson<Empire>(path.join(ROOT, 'data', 'empires', id, 'timeline.json'));
    const statsFile = path.join(ROOT, 'data', 'empires', id, 'stats.json');
    return { ...e, stats: e.stats ?? (fs.existsSync(statsFile) ? readJson<EmpireStats>(statsFile) : undefined) };
  })
  .sort((a, b) => a.start - b.start);

function apogeeTerritory(e: Empire): Geo {
  const stepId = apogeeStepId(e) ?? e.steps.at(-1)!.id;
  const step = e.steps.find((s) => s.id === stepId)!;
  return readJson<Geo>(path.join(ROOT, 'public', 'data', 'empires', e.id, 'territories', `${step.territory}.geojson`));
}

/* ---------- Pages HTML à photographier ---------- */

// Polices intégrées en data: (une page ouverte par setContent n'a pas le droit de lire des fichiers locaux).
const font = (file: string) => `data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, 'node_modules', '@fontsource', file)).toString('base64')}`;
const FONTS = `<style>
@font-face{font-family:Cormorant;font-weight:700;src:url(${font('cormorant-garamond/files/cormorant-garamond-latin-700-normal.woff2')})}
@font-face{font-family:Cormorant;font-weight:500;font-style:italic;src:url(${font('cormorant-garamond/files/cormorant-garamond-latin-500-italic.woff2')})}
@font-face{font-family:Inter;font-weight:500;src:url(${font('inter/files/inter-latin-500-normal.woff2')})}
*{box-sizing:border-box;margin:0}body{width:1200px;height:630px;overflow:hidden;background:${PARCHMENT};color:${INK};font-family:Inter,sans-serif}
.card{display:flex;width:1200px;height:630px}
.text{width:520px;padding:56px 40px 48px 56px;display:flex;flex-direction:column;gap:18px;border-right:6px solid ${INK}}
.emblem{width:128px;height:128px}.name{font:700 58px/1.02 Cormorant,serif}.dates{font:italic 500 34px/1.1 Cormorant,serif;color:#6d4c2a}
.brand{margin-top:auto;font-size:22px;letter-spacing:.04em;color:#5c4a38}.brand b{color:${INK}}
.map{width:680px;height:630px}
</style>`;

function empireCard(e: Empire): string {
  const fc = apogeeTerritory(e);
  const emblem = EMBLEMS[e.id]?.svg ?? '';
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}</head><body><div class="card"><div class="text">${
    emblem ? `<div class="emblem">${emblem.replace('<svg ', '<svg width="128" height="128" ')}</div>` : ''
  }<div class="name">${e.name}</div><div class="dates">${formatYear(e.start)} – ${formatYear(e.end)}</div><div class="brand"><b>${SITE_NAME}</b> · carte interactive</div></div><div class="map">${mapSvg(680, 630, [{ fc, color: e.color }], bboxOf([fc]))}</div></div></body></html>`;
}

function atlasCard(): string {
  const layers = empires.map((e) => ({ fc: apogeeTerritory(e), color: e.color }));
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>.wide{position:absolute;inset:0}.wide svg{display:block}.over{position:absolute;left:40px;bottom:40px;padding:26px 34px;background:rgba(244,234,211,.93);border:3px solid ${INK};border-radius:10px;max-width:560px}.over .name{font-size:68px}.over .dates{font-size:30px;margin-top:8px}</style></head><body><div class="wide">${mapSvg(1200, 630, layers, [-20, 0, 135, 62], 0.02)}</div><div class="over"><div class="name">${SITE_NAME}</div><div class="dates">Les grands empires, étape par étape, sur une carte animée</div></div></body></html>`;
}

/** Icône : un globe sur parchemin, méridiens dorés et un territoire rouge. `round` : coins arrondis (favicon). */
function iconSvg(round: boolean): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="${round ? 14 : 0}" fill="${INK}"/><defs><clipPath id="g"><circle cx="32" cy="32" r="22"/></clipPath></defs><circle cx="32" cy="32" r="22" fill="${PARCHMENT}"/><g clip-path="url(#g)"><path d="M17 27c5-6 13-8 19-5s7 9 13 9 5 8-1 11-12 1-17 4-13-2-14-8 0-7 0-11z" fill="#a8281e" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/><g fill="none" stroke="#8a6a44" stroke-width="1.3"><ellipse cx="32" cy="32" rx="9.5" ry="22"/><path d="M32 10v44M10 32h44M13 21h38M13 43h38"/></g></g><circle cx="32" cy="32" r="22" fill="none" stroke="${GOLD}" stroke-width="3"/></svg>`;
}

/* ---------- Rendu ---------- */

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
async function shot(html: string, file: string, size?: number) {
  if (size) await page.setViewportSize({ width: size, height: size });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file, type: 'png' });
  if (size) await page.setViewportSize({ width: 1200, height: 630 });
}

for (const e of empires) {
  await shot(empireCard(e), path.join(OUT, `${e.id}.png`));
  console.log(`og/${e.id}.png`);
}
await shot(atlasCard(), path.join(OUT, 'atlas.png'));
console.log('og/atlas.png');

fs.writeFileSync(path.join(ROOT, 'public', 'favicon.svg'), iconSvg(true) + '\n');
const iconPage = (size: number) =>
  `<!doctype html><html><head><style>*{margin:0}body{width:${size}px;height:${size}px}svg{display:block;width:${size}px;height:${size}px}</style></head><body>${iconSvg(false)}</body></html>`;
for (const [name, size] of [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
] as const) {
  await shot(iconPage(size), path.join(ROOT, 'public', name), size);
  console.log(name);
}
await browser.close();
