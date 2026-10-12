// Champs de distance signés pour l'animation de frontière (shader WebGL) :
//   public/data/empires/<id>/sdf/<stepId>.png  (RGB, sans alpha) + <stepId>.json
// Pour chaque étape sauf la première (transition prev → cur), grille Web Mercator :
//   R = SDF signé de cur, G = SDF signé de prev (128 + d/RANGE_KM*127, >128 = dedans),
//   B = temps : 0 hors zones changées, 1..255 = 1 + round(t*254) ; gagné : t = dist. à prev / dmax_gain,
//       perdu : t = 1 − dist. à cur / dmax_loss ; prolongé de 2 px au-delà des zones changées.
// Usage : npx tsx scripts/build-sdf.ts [--empire <id>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as turf from '@turf/turf';
import { PNG } from 'pngjs';
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EMPIRES_DATA = path.join(ROOT, 'data/empires');
const EMPIRES_PUB = path.join(ROOT, 'public/data/empires');

const STEP_DEG = 0.08;
const MAX_SIDE = 1024;
const MARGIN_DEG = 1;
const SS = 3;
const R_EARTH = 6371.0088;
const AREA_TOL = 0.03;
const ABS_TOL_KM2 = 500;
const DEG = Math.PI / 180;
const INF = 1e20;
const MAX_BYTES = 245 * 1024;

interface Step { id: string; year: number; territory: string; location: [number, number] }
type Geom = Polygon | MultiPolygon;

const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (Math.max(-85, Math.min(85, lat)) * DEG) / 2));
const mercLat = (y: number) => (2 * Math.atan(Math.exp(y)) - Math.PI / 2) / DEG;

function loadGeoms(file: string): Feature<Geom>[] {
  const fc = JSON.parse(fs.readFileSync(file, 'utf8')) as FeatureCollection;
  // Les alliés contraints (status 'allied') ne sont qu'un contour : exclus du glissement.
  return fc.features.filter(
    (f): f is Feature<Geom> =>
      f.properties?.status !== 'allied' && !!f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'),
  );
}

function polygonsOf(fs_: Feature<Geom>[]): Position[][][] {
  const out: Position[][][] = [];
  for (const f of fs_) {
    if (f.geometry.type === 'Polygon') out.push(f.geometry.coordinates);
    else out.push(...f.geometry.coordinates);
  }
  return out;
}

function bboxOf(polys: Position[][][]): [number, number, number, number] {
  let w = 180, s = 90, e = -180, n = -90;
  for (const p of polys) for (const r of p) for (const [x, y] of r) {
    if (x < w) w = x; if (x > e) e = x; if (y < s) s = y; if (y > n) n = y;
  }
  return [w, s, e, n];
}

interface Grid { W: number; H: number; x0: number; yTop: number; cell: number }

/** Scanline pair-impair, par polygone (OU entre polygones). Grille sur-échantillonnée SS×, puis vote majoritaire. */
function rasterize(polys: Position[][][], g: Grid): Uint8Array {
  const SW = g.W * SS, SH = g.H * SS, sc = g.cell / SS;
  const sup = new Uint8Array(SW * SH);
  for (const poly of polys) {
    // arêtes en coordonnées grille sur-échantillonnée
    const edges: number[] = []; // x0,y0,x1,y1
    let ymin = Infinity, ymax = -Infinity;
    for (const ring of poly) {
      for (let i = 0; i < ring.length - 1; i++) {
        const ax = (ring[i][0] * DEG - g.x0) / sc, ay = (g.yTop - mercY(ring[i][1])) / sc;
        const bx = (ring[i + 1][0] * DEG - g.x0) / sc, by = (g.yTop - mercY(ring[i + 1][1])) / sc;
        if (ay === by) continue;
        edges.push(ax, ay, bx, by);
        ymin = Math.min(ymin, ay, by); ymax = Math.max(ymax, ay, by);
      }
    }
    if (!edges.length) continue;
    const j0 = Math.max(0, Math.ceil(ymin - 0.5)), j1 = Math.min(SH - 1, Math.floor(ymax - 0.5));
    const xs: number[] = [];
    for (let j = j0; j <= j1; j++) {
      const ys = j + 0.5;
      xs.length = 0;
      for (let k = 0; k < edges.length; k += 4) {
        const ay = edges[k + 1], by = edges[k + 3];
        if ((ay <= ys) !== (by <= ys)) xs.push(edges[k] + ((ys - ay) / (by - ay)) * (edges[k + 2] - edges[k]));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const a = Math.max(0, Math.ceil(xs[k] - 0.5)), b = Math.min(SW - 1, Math.ceil(xs[k + 1] - 0.5) - 1);
        sup.fill(1, j * SW + a, j * SW + b + 1);
      }
    }
  }
  const m = new Uint8Array(g.W * g.H);
  for (let y = 0; y < g.H; y++) for (let x = 0; x < g.W; x++) {
    let c = 0;
    for (let dy = 0; dy < SS; dy++) for (let dx = 0; dx < SS; dx++) c += sup[(y * SS + dy) * SW + x * SS + dx];
    m[y * g.W + x] = c * 2 > SS * SS ? 1 : 0;
  }
  return m;
}

/** Felzenszwalb & Huttenlocher, 1D sur le carré des distances. */
function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s: number;
    for (;;) {
      const p = v[k];
      s = (f[q] + q * q - (f[p] + p * p)) / (2 * q - 2 * p);
      if (s <= z[k] && k > 0) k--; else break;
    }
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) ** 2 + f[v[k]];
  }
}

/** Distance (en pixels) de chaque pixel au plus proche pixel où src === 1 (0 sur src). INF si src vide. */
function edt(src: Uint8Array, W: number, H: number): Float32Array {
  const n = Math.max(W, H);
  const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  const tmp = new Float64Array(W * H);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) f[y] = src[y * W + x] ? 0 : INF;
    edt1d(f, H, d, v, z);
    for (let y = 0; y < H; y++) tmp[y * W + x] = d[y];
  }
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) f[x] = tmp[y * W + x];
    edt1d(f, W, d, v, z);
    for (let x = 0; x < W; x++) out[y * W + x] = d[x] >= INF / 2 ? INF : Math.sqrt(d[x]);
  }
  return out;
}

const invert = (m: Uint8Array) => m.map((v) => 1 - v) as Uint8Array;

/** Distance signée en pixels (>0 dedans), bord à mi-chemin entre centres de pixels dedans/dehors. */
function signedPx(mask: Uint8Array, W: number, H: number): Float32Array {
  const dOut = edt(mask, W, H); // pour pixels dehors : dist. au dedans le plus proche
  const dIn = edt(invert(mask), W, H); // pour pixels dedans : dist. au dehors le plus proche
  const s = new Float32Array(W * H);
  for (let i = 0; i < s.length; i++) s[i] = mask[i] ? Math.min(dIn[i], 1e6) - 0.5 : -(Math.min(dOut[i], 1e6) - 0.5);
  return s;
}

function unionArea(feats: Feature<Geom>[]): number {
  if (!feats.length) return 0;
  try {
    const u = feats.length === 1 ? feats[0] : turf.union(turf.featureCollection(feats));
    if (u) return turf.area(u) / 1e6;
  } catch { /* repli */ }
  return feats.reduce((a, f) => a + turf.area(f), 0) / 1e6;
}

function buildEmpire(id: string) {
  const timeline = JSON.parse(fs.readFileSync(path.join(EMPIRES_DATA, id, 'timeline.json'), 'utf8')) as { steps: Step[] };
  const steps = [...timeline.steps].sort((a, b) => a.year - b.year);
  const outDir = path.join(EMPIRES_PUB, id, 'sdf');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const terr = (s: Step) => loadGeoms(path.join(EMPIRES_PUB, id, 'territories', `${s.territory}.geojson`));
  const rows: string[][] = [];
  let total = 0;
  let worst = 0;

  for (let i = 1; i < steps.length; i++) {
    const step = steps[i];
    const prevF = terr(steps[i - 1]), curF = terr(step);
    const prevP = polygonsOf(prevF), curP = polygonsOf(curF);
    const bb = bboxOf([...prevP, ...curP]);
    const w = Math.max(-180, bb[0] - MARGIN_DEG), e = Math.min(180, bb[2] + MARGIN_DEG);
    const s = Math.max(-85, bb[1] - MARGIN_DEG), n = Math.min(85, bb[3] + MARGIN_DEG);
    const x0 = w * DEG, x1 = e * DEG, yTop = mercY(n), yBot = mercY(s);
    let scale = 1, buf: Buffer = Buffer.alloc(0), W = 0, H = 0, areaCur = 0, areaPrev = 0, fromLoc = false;
    for (; ; scale *= 1.1) {
    const cell = scale * Math.max(STEP_DEG * DEG, (x1 - x0) / MAX_SIDE, (yTop - yBot) / MAX_SIDE);
    W = Math.ceil((x1 - x0) / cell), H = Math.ceil((yTop - yBot) / cell);
    const g: Grid = { W, H, x0, yTop, cell };
    const east = (x0 + W * cell) / DEG, south = mercLat(yTop - H * cell);
    const N = W * H;

    const prev = rasterize(prevP, g), cur = rasterize(curP, g);
    const sPrev = signedPx(prev, W, H), sCur = signedPx(cur, W, H);

    // facteur km/pixel par ligne
    const rowKm = new Float32Array(H);
    for (let y = 0; y < H; y++) rowKm[y] = cell * R_EARTH * Math.cos(mercLat(yTop - (y + 0.5) * cell) * DEG);
    const midKm = rowKm[H >> 1];
    const rangeKm = 4 * midKm;

    const gained = new Uint8Array(N), lost = new Uint8Array(N), inter = new Uint8Array(N);
    let nPrev = 0, nInter = 0;
    for (let k = 0; k < N; k++) {
      gained[k] = cur[k] && !prev[k] ? 1 : 0;
      lost[k] = prev[k] && !cur[k] ? 1 : 0;
      inter[k] = prev[k] && cur[k] ? 1 : 0;
      nPrev += prev[k]; nInter += inter[k];
    }
    // distances (km) : gagné → à prev, perdu → à cur ; repli : depuis la location
    fromLoc = nPrev === 0 || nInter === 0;
    const dist = new Float32Array(N);
    if (fromLoc) {
      const lx = (step.location[0] * DEG - x0) / cell, ly = (yTop - mercY(step.location[1])) / cell;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) dist[y * W + x] = Math.hypot(x + 0.5 - lx, y + 0.5 - ly) * rowKm[y];
    } else {
      for (let k = 0; k < N; k++) {
        // sPrev<0 hors prev : -sPrev-0.5+... on reprend la distance pixel exacte ≈ |s|+0.5
        if (gained[k]) dist[k] = (-sPrev[k] + 0.5) * rowKm[(k / W) | 0];
        else if (lost[k]) dist[k] = (-sCur[k] + 0.5) * rowKm[(k / W) | 0];
      }
    }
    let gainKm = 0, lossKm = 0;
    for (let k = 0; k < N; k++) {
      if (gained[k]) gainKm = Math.max(gainKm, dist[k]);
      else if (lost[k]) lossKm = Math.max(lossKm, dist[k]);
    }
    let B = new Uint8Array(N);
    for (let k = 0; k < N; k++) {
      if (gained[k]) B[k] = 1 + Math.round((gainKm > 0 ? dist[k] / gainKm : 0) * 254);
      else if (lost[k]) B[k] = 1 + Math.round((1 - (lossKm > 0 ? dist[k] / lossKm : 0)) * 254);
    }
    // dilatation de 2 px (voisin le plus proche, 8-voisinage)
    for (let it = 0; it < 2; it++) {
      const nb = B.slice();
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const k = y * W + x;
        if (B[k]) continue;
        let best = 0;
        for (let dy = -1; dy <= 1 && !best; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const v = B[yy * W + xx];
          if (v) { best = v; break; }
        }
        nb[k] = best;
      }
      B = nb;
    }

    const png = new PNG({ width: W, height: H, colorType: 2, inputColorType: 6, inputHasAlpha: true, deflateLevel: 9 });
    const q = (v: number) => 128 + Math.max(-128, Math.min(127, Math.round(((v * midKm) / rangeKm) * 127)));
    let cntCur = 0, cntPrev = 0; areaCur = 0; areaPrev = 0;
    for (let k = 0; k < N; k++) {
      // s est en pixels ; on convertit en km avec le facteur de la ligne
      const rk = rowKm[(k / W) | 0];
      const r = 128 + Math.max(-128, Math.min(127, Math.round(((sCur[k] * rk) / rangeKm) * 127)));
      const gg = 128 + Math.max(-128, Math.min(127, Math.round(((sPrev[k] * rk) / rangeKm) * 127)));
      png.data[k * 4] = r; png.data[k * 4 + 1] = gg; png.data[k * 4 + 2] = B[k]; png.data[k * 4 + 3] = 255;
      const a = rk * rk;
      if (r >= 128) { cntCur++; areaCur += a; }
      if (gg >= 128) { cntPrev++; areaPrev += a; }
    }
    void q; void cntCur; void cntPrev;
    buf = PNG.sync.write(png, { colorType: 2, inputColorType: 6, inputHasAlpha: true, deflateLevel: 9 });
    if (buf.length > MAX_BYTES && scale < 2) continue; // trop lourd : grille moins fine
    fs.writeFileSync(path.join(outDir, `${step.id}.png`), buf);
    fs.writeFileSync(
      path.join(outDir, `${step.id}.json`),
      JSON.stringify({
        bounds: [[w, n], [east, n], [east, south], [w, south]],
        width: W, height: H,
        rangeKm: +rangeKm.toFixed(3), gainKm: +gainKm.toFixed(2), lossKm: +lossKm.toFixed(2),
      }),
    );
    break;
    }
    total += buf.length;

    const vPrev = unionArea(prevF), vCur = unionArea(curF);
    const dev = (r: number, v: number) => {
      const d = r - v;
      const ok = Math.abs(d) <= Math.max(ABS_TOL_KM2, AREA_TOL * v);
      worst = Math.max(worst, ok ? 0 : 1);
      return `${(v ? (d / v) * 100 : 0).toFixed(2)} % (${d >= 0 ? '+' : ''}${d.toFixed(0)} km²)${ok ? '' : ' !!'}`;
    };
    rows.push([step.id, `${W}×${H}`, (buf.length / 1024).toFixed(0), dev(areaPrev, vPrev), dev(areaCur, vCur), fromLoc ? 'loc' : '']);
  }

  console.log(`\n== ${id} ==`);
  const head = ['id', 'W×H', 'Ko', 'Δ prev', 'Δ cur', 'origine t'];
  const wd = head.map((h, c) => Math.max(h.length, ...rows.map((r) => r[c].length)));
  const fmt = (r: string[]) => r.map((c, k) => c.padEnd(wd[k])).join(' | ');
  console.log(fmt(head));
  for (const r of rows) console.log(fmt(r));
  const maxKo = Math.max(...rows.map((r) => +r[2]));
  console.log(`total ${(total / 1048576).toFixed(2)} Mo, max ${maxKo} Ko/PNG${maxKo > 250 ? ' (> 250 Ko !)' : ''}${total > 6 * 1048576 ? ' (> 6 Mo !)' : ''}`);
  if (worst) { console.error('Contrôle d\'aire hors tolérance'); process.exitCode = 1; }
}

const argv = process.argv.slice(2);
const only = argv.includes('--empire') ? argv[argv.indexOf('--empire') + 1] : null;
const ids = only ? [only] : fs.readdirSync(EMPIRES_DATA).filter((d) => fs.existsSync(path.join(EMPIRES_DATA, d, 'timeline.json')));
for (const id of ids) buildEmpire(id);
