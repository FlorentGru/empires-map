/**
 * Dessin du paysage d'une bataille, style « carte illustrée » (aplats, contour #3b2a1a fin, sur parchemin).
 * Tout ce qui est BAS (sol, champs, routes, rivières, collines, marais, maisons, rochers, étiquettes) est précalculé
 * dans un canvas hors écran (`buildGround`) ; les arbres, hauts, sont des sprites prérendus que render.ts dessine
 * avec les figurines, triés par profondeur. Mise en page (pure, testée) : layout.ts.
 */
import type { BattleBiome, BattleDecor, BattleScenario } from '../types-battle';
import { hash01, TERRAIN_H, TERRAIN_W } from './engine';
import { sceneryLayout, type SceneHouse, type SceneRock, type SceneryLayout, type SceneTree, type SceneShape, type TreeKind } from './layout';

const INK = '#3b2a1a';
type Ctx = CanvasRenderingContext2D;

/** Le paysage d'une bataille prêt à être affiché à une taille donnée. */
export interface Scenery {
  /** Sol + éléments bas, à la taille du canvas (pixels physiques). */
  ground: HTMLCanvasElement;
  layout: SceneryLayout;
  w: number;
  h: number;
  dpr: number;
}

const GROUND: Record<BattleBiome, string> = {
  prairie: '#cfdca6',
  steppe: '#dcd69b',
  desert: '#ecd8a6',
  foret: '#aebf86',
  montagne: '#c4bba5',
  mediterranee: '#e4d29e',
  mer: '#a9c9d3',
};

/** Construit le paysage (sol hors écran + mise en page). Appelé au changement de bataille ou de taille. */
export function buildScenery(scenario: BattleScenario, biomeIn: BattleBiome, w: number, h: number, dpr: number): Scenery {
  const biome: BattleBiome = scenario.terrain === 'mer' ? 'mer' : biomeIn;
  const layout = sceneryLayout(scenario, biome);
  const ground = document.createElement('canvas');
  ground.width = Math.max(1, Math.round(w * dpr));
  ground.height = Math.max(1, Math.round(h * dpr));
  const ctx = ground.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
    drawGround(ctx, w, h, biome, layout, `${biome}:${scenario.units[0]?.id ?? ''}`);
  }
  return { ground, layout, w, h, dpr };
}

// ---------------------------------------------------------------------------------------------------------------
// Sol
// ---------------------------------------------------------------------------------------------------------------

let grainTile: HTMLCanvasElement | null = null;
/** Grain fin du papier : petite tuile de points bruns, répétée en motif. */
function grain(): HTMLCanvasElement {
  if (grainTile) return grainTile;
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d')!;
  for (let i = 0; i < 520; i++) {
    g.fillStyle = `rgba(90, 64, 36, ${0.03 + hash01(`ga${i}`) * 0.07})`;
    g.fillRect(hash01(`gx${i}`) * 96, hash01(`gy${i}`) * 96, 1 + (hash01(`gs${i}`) > 0.8 ? 1 : 0), 1);
  }
  grainTile = c;
  return c;
}

function drawGround(ctx: Ctx, w: number, h: number, biome: BattleBiome, layout: SceneryLayout, seed: string) {
  const sx = w / TERRAIN_W;
  const sy = h / TERRAIN_H;
  ctx.fillStyle = GROUND[biome];
  ctx.fillRect(0, 0, w, h);
  // Taches de papier (bord fondu : un disque net ferait des cercles visibles).
  for (let i = 0; i < 22; i++) {
    const x = hash01(`tx${seed}${i}`) * w;
    const y = hash01(`ty${seed}${i}`) * h;
    const r = (0.03 + hash01(`tr${seed}${i}`) * 0.07) * w;
    const spot = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = hash01(`tk${seed}${i}`) > 0.45;
    spot.addColorStop(0, dark ? 'rgba(110, 84, 46, 0.06)' : 'rgba(255, 250, 225, 0.10)');
    spot.addColorStop(1, 'rgba(110, 84, 46, 0)');
    ctx.fillStyle = spot;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const pat = ctx.createPattern(grain(), 'repeat');
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
  }
  drawMotifs(ctx, w, h, biome, seed);

  // Éléments bas, du plus étalé au plus détaillé.
  const order: BattleDecor['kind'][] = ['colline', 'foret', 'champ', 'marais', 'cote', 'riviere', 'route', 'pont'];
  for (const kind of order) for (const d of layout.shapes) if (d.kind === kind) drawShape(ctx, d, sx, sy, w, biome);
  for (const r of layout.rocks) drawRock(ctx, r, sx, sy);
  for (const hs of layout.houses) drawHouse(ctx, hs, sx, sy, biome);
  drawLabels(ctx, layout.shapes, sx, sy, w, h);

  // Vignettage parchemin.
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(60, 40, 20, 0)');
  g.addColorStop(1, 'rgba(60, 40, 20, 0.28)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Motifs épars du sol, par biome (touffes, rides de dune, cailloux, vaguelettes…). */
function drawMotifs(ctx: Ctx, w: number, h: number, biome: BattleBiome, seed: string) {
  const n = Math.round(Math.max(90, Math.min(520, (w * h) / 2600)));
  const u = Math.max(5, w * 0.009);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    const x = hash01(`mx${seed}${i}`) * w;
    const y = hash01(`my${seed}${i}`) * h;
    const r = hash01(`mr${seed}${i}`);
    ctx.lineWidth = 1;
    switch (biome) {
      case 'prairie':
      case 'foret':
      case 'steppe': {
        // Touffes d'herbe : trois brins ; plus courts et secs en steppe.
        const len = u * (biome === 'steppe' ? 0.5 : 0.8) * (0.7 + r * 0.6);
        ctx.strokeStyle = biome === 'steppe' ? 'rgba(130, 120, 56, 0.55)' : biome === 'foret' ? 'rgba(52, 84, 44, 0.6)' : 'rgba(78, 120, 58, 0.55)';
        ctx.beginPath();
        for (const d of [-0.5, 0, 0.5]) {
          ctx.moveTo(x, y);
          ctx.lineTo(x + d * len, y - len * (d === 0 ? 1 : 0.8));
        }
        ctx.stroke();
        break;
      }
      case 'desert': {
        if (r < 0.62) {
          // Ride de dune : arc doux avec son ombre.
          const a = u * (1.5 + r * 2.5);
          ctx.strokeStyle = 'rgba(150, 112, 60, 0.4)';
          ctx.beginPath();
          ctx.moveTo(x - a, y);
          ctx.quadraticCurveTo(x, y - a * 0.45, x + a, y + a * 0.1);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255, 246, 215, 0.45)';
          ctx.beginPath();
          ctx.moveTo(x - a, y + 2);
          ctx.quadraticCurveTo(x, y - a * 0.45 + 2, x + a, y + a * 0.1 + 2);
          ctx.stroke();
        } else {
          pebble(ctx, x, y, u * (0.18 + r * 0.2), '#b49a70');
        }
        break;
      }
      case 'montagne': {
        // Éboulis : petits cailloux anguleux et traits de roche.
        if (r < 0.6) pebble(ctx, x, y, u * (0.2 + r * 0.3), '#9d9684');
        else {
          ctx.strokeStyle = 'rgba(90, 74, 56, 0.4)';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + u * 0.9, y + u * 0.35);
          ctx.moveTo(x + u * 0.3, y + u * 0.2);
          ctx.lineTo(x + u * 0.1, y + u * 0.7);
          ctx.stroke();
        }
        break;
      }
      case 'mediterranee': {
        if (r < 0.55) {
          // Garrigue : buisson bas gris-vert.
          ctx.fillStyle = 'rgba(120, 130, 78, 0.55)';
          ctx.strokeStyle = 'rgba(59, 42, 26, 0.45)';
          ctx.beginPath();
          ctx.ellipse(x, y, u * (0.5 + r * 0.4), u * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else pebble(ctx, x, y, u * 0.22, '#bfa77a');
        break;
      }
      case 'mer': {
        // Vaguelettes : deux petits arcs.
        const a = u * (0.8 + r * 0.8);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.beginPath();
        ctx.moveTo(x - a, y);
        ctx.quadraticCurveTo(x - a / 2, y - a * 0.4, x, y);
        ctx.quadraticCurveTo(x + a / 2, y + a * 0.4, x + a, y);
        ctx.stroke();
        break;
      }
    }
  }
}

function pebble(ctx: Ctx, x: number, y: number, r: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = 'rgba(59, 42, 26, 0.5)';
  ctx.beginPath();
  ctx.moveTo(x - r, y + r * 0.3);
  ctx.lineTo(x - r * 0.4, y - r * 0.6);
  ctx.lineTo(x + r * 0.6, y - r * 0.5);
  ctx.lineTo(x + r, y + r * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// ---------------------------------------------------------------------------------------------------------------
// Formes du décor
// ---------------------------------------------------------------------------------------------------------------

function polyPath(ctx: Ctx, d: SceneShape, sx: number, sy: number) {
  ctx.beginPath();
  d.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * sx, y * sy) : ctx.lineTo(x * sx, y * sy)));
  ctx.closePath();
}

/** Ligne lissée par des courbes passant par les milieux des segments. */
function smoothPath(ctx: Ctx, d: SceneShape, sx: number, sy: number) {
  const p = d.points.map(([x, y]) => [x * sx, y * sy] as const);
  ctx.beginPath();
  ctx.moveTo(p[0]![0], p[0]![1]);
  if (p.length === 2) ctx.lineTo(p[1]![0], p[1]![1]);
  for (let i = 1; i < p.length - 1; i++) {
    const [x, y] = p[i]!;
    const [nx, ny] = p[i + 1]!;
    ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  if (p.length > 2) ctx.lineTo(p[p.length - 1]![0], p[p.length - 1]![1]);
}

function bbox(d: SceneShape, sx: number, sy: number) {
  const xs = d.points.map((p) => p[0] * sx);
  const ys = d.points.map((p) => p[1] * sy);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

function drawShape(ctx: Ctx, d: SceneShape, sx: number, sy: number, w: number, biome: BattleBiome) {
  if (d.points.length < 2) return;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  switch (d.kind) {
    case 'colline':
      return drawHill(ctx, d, sx, sy, biome);
    case 'foret':
      // Sous-bois : tache sombre sous les arbres.
      polyPath(ctx, d, sx, sy);
      ctx.fillStyle = biome === 'desert' ? 'rgba(120, 150, 80, 0.3)' : 'rgba(58, 96, 54, 0.3)';
      ctx.fill();
      return;
    case 'champ':
      return drawField(ctx, d, sx, sy);
    case 'marais':
      return drawMarsh(ctx, d, sx, sy, w);
    case 'cote':
      return drawCoast(ctx, d, sx, sy, w);
    case 'riviere':
      return drawRiver(ctx, d, sx, sy, w);
    case 'route':
      return drawRoad(ctx, d, sx, sy, w);
    case 'pont':
      return drawBridge(ctx, d, sx, sy, w, biome);
    case 'village':
    case 'ville':
      if (d.points.length >= 3) {
        // Aire bâtie : sol de terre battue sous les maisons.
        polyPath(ctx, d, sx, sy);
        ctx.fillStyle = d.kind === 'ville' ? 'rgba(168, 142, 104, 0.4)' : 'rgba(168, 142, 104, 0.25)';
        ctx.fill();
      }
      return;
    default:
      return;
  }
}

function drawHill(ctx: Ctx, d: SceneShape, sx: number, sy: number, biome: BattleBiome) {
  const b = bbox(d, sx, sy);
  const green = biome === 'prairie' || biome === 'foret';
  const g = ctx.createLinearGradient(b.x0, b.y0, b.x1, b.y1);
  g.addColorStop(0, green ? 'rgba(236, 240, 190, 0.55)' : 'rgba(250, 236, 190, 0.55)');
  g.addColorStop(0.5, green ? 'rgba(150, 150, 84, 0.3)' : 'rgba(176, 140, 84, 0.3)');
  g.addColorStop(1, 'rgba(92, 64, 36, 0.5)');
  polyPath(ctx, d, sx, sy);
  ctx.fillStyle = g;
  ctx.fill();
  // Hachures du versant sud-est.
  ctx.save();
  polyPath(ctx, d, sx, sy);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(b.x1 + 4, b.y0 - 4);
  ctx.lineTo(b.x1 + 4, b.y1 + 4);
  ctx.lineTo(b.x0 - 4, b.y1 + 4);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = 'rgba(70, 48, 26, 0.28)';
  ctx.lineWidth = 1;
  const step = Math.max(5, (b.x1 - b.x0) / 28);
  ctx.beginPath();
  for (let x = b.x0 - (b.y1 - b.y0); x < b.x1 + 4; x += step) {
    ctx.moveTo(x, b.y1 + 4);
    ctx.lineTo(x + (b.y1 - b.y0 + 8), b.y0 - 4);
  }
  ctx.stroke();
  ctx.restore();
  polyPath(ctx, d, sx, sy);
  ctx.strokeStyle = 'rgba(59, 42, 26, 0.55)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawField(ctx: Ctx, d: SceneShape, sx: number, sy: number) {
  const b = bbox(d, sx, sy);
  const horizontal = hash01(`f${d.points[0]![0].toFixed(1)}${d.points[0]![1].toFixed(1)}`) > 0.5;
  polyPath(ctx, d, sx, sy);
  ctx.fillStyle = '#dcc272';
  ctx.fill();
  ctx.save();
  polyPath(ctx, d, sx, sy);
  ctx.clip();
  const step = Math.max(3, (horizontal ? b.y1 - b.y0 : b.x1 - b.x0) / 9);
  ctx.strokeStyle = 'rgba(150, 108, 40, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (horizontal) for (let y = b.y0; y <= b.y1; y += step) (ctx.moveTo(b.x0 - 2, y), ctx.lineTo(b.x1 + 2, y));
  else for (let x = b.x0; x <= b.x1; x += step) (ctx.moveTo(x, b.y0 - 2), ctx.lineTo(x, b.y1 + 2));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 238, 168, 0.5)';
  ctx.beginPath();
  if (horizontal) for (let y = b.y0 + step / 2; y <= b.y1; y += step) (ctx.moveTo(b.x0 - 2, y), ctx.lineTo(b.x1 + 2, y));
  else for (let x = b.x0 + step / 2; x <= b.x1; x += step) (ctx.moveTo(x, b.y0 - 2), ctx.lineTo(x, b.y1 + 2));
  ctx.stroke();
  ctx.restore();
  polyPath(ctx, d, sx, sy);
  ctx.strokeStyle = 'rgba(59, 42, 26, 0.6)';
  ctx.stroke();
}

function drawMarsh(ctx: Ctx, d: SceneShape, sx: number, sy: number, w: number) {
  polyPath(ctx, d, sx, sy);
  ctx.fillStyle = 'rgba(122, 164, 160, 0.7)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(59, 42, 26, 0.45)';
  ctx.stroke();
  const b = bbox(d, sx, sy);
  const u = Math.max(5, w * 0.009);
  ctx.save();
  polyPath(ctx, d, sx, sy);
  ctx.clip();
  // Reflets puis roseaux (traits verticaux à tête brune).
  const n = Math.max(6, Math.round(((b.x1 - b.x0) * (b.y1 - b.y0)) / (u * u * 9)));
  for (let i = 0; i < n; i++) {
    const x = b.x0 + hash01(`mq${b.x0 | 0}${i}`) * (b.x1 - b.x0);
    const y = b.y0 + hash01(`mw${b.y0 | 0}${i}`) * (b.y1 - b.y0);
    if (i % 3 === 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.moveTo(x - u * 0.7, y);
      ctx.lineTo(x + u * 0.7, y);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#56713f';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - u * 1.1);
      ctx.moveTo(x + u * 0.25, y);
      ctx.lineTo(x + u * 0.35, y - u * 0.9);
      ctx.stroke();
      ctx.fillStyle = '#7a5a34';
      ctx.fillRect(x - 1, y - u * 1.25, 2, u * 0.35);
    }
  }
  ctx.restore();
}

function drawCoast(ctx: Ctx, d: SceneShape, sx: number, sy: number, w: number) {
  polyPath(ctx, d, sx, sy);
  ctx.fillStyle = 'rgba(138, 186, 202, 0.75)';
  ctx.fill();
  // Écume : large trait clair puis fin, le long du rivage.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = Math.max(3, w * 0.006);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(59, 42, 26, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  const b = bbox(d, sx, sy);
  const u = Math.max(5, w * 0.009);
  ctx.save();
  polyPath(ctx, d, sx, sy);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  for (let i = 0; i < 18; i++) {
    const x = b.x0 + hash01(`cx${b.x0 | 0}${i}`) * (b.x1 - b.x0);
    const y = b.y0 + hash01(`cy${b.y0 | 0}${i}`) * (b.y1 - b.y0);
    ctx.beginPath();
    ctx.moveTo(x - u, y);
    ctx.quadraticCurveTo(x - u / 2, y - u * 0.4, x, y);
    ctx.quadraticCurveTo(x + u / 2, y + u * 0.4, x + u, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRiver(ctx: Ctx, d: SceneShape, sx: number, sy: number, w: number) {
  const width = Math.max(7, w * 0.02);
  smoothPath(ctx, d, sx, sy);
  ctx.strokeStyle = 'rgba(59, 42, 26, 0.6)';
  ctx.lineWidth = width + 3;
  ctx.stroke();
  smoothPath(ctx, d, sx, sy);
  ctx.strokeStyle = '#6f95a5'; // berges plus foncées
  ctx.lineWidth = width + 1;
  ctx.stroke();
  smoothPath(ctx, d, sx, sy);
  ctx.strokeStyle = '#a3cad6';
  ctx.lineWidth = width - 2;
  ctx.stroke();
  // Reflets : traits clairs en pointillé, décalés du centre.
  smoothPath(ctx, d, sx, sy);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([width * 0.9, width * 1.8]);
  ctx.translate(0, -width * 0.18);
  ctx.stroke();
  ctx.translate(0, width * 0.18);
  ctx.setLineDash([]);
}

/**
 * Marée descendante : par-dessus la rivière précalculée, bandes de vase sur les berges (large à marée basse) et eau plus étroite.
 * `ebb` va de 0 (marée haute : rien à dessiner) à 1 (marée basse).
 */
export function drawRiverTide(ctx: Ctx, d: SceneShape, sx: number, sy: number, w: number, ebb: number) {
  const width = Math.max(7, w * 0.02);
  ctx.save();
  ctx.globalAlpha = Math.min(1, ebb * 8); // apparition douce au début du reflux
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const mud = width + 3 + w * 0.03 * ebb;
  smoothPath(ctx, d, sx, sy);
  ctx.strokeStyle = 'rgba(59, 42, 26, 0.55)';
  ctx.lineWidth = mud + 2;
  ctx.stroke();
  smoothPath(ctx, d, sx, sy);
  ctx.strokeStyle = '#b8a477';
  ctx.lineWidth = mud;
  ctx.stroke();
  smoothPath(ctx, d, sx, sy);
  ctx.strokeStyle = '#8f7c55'; // vase humide, plus sombre près de l'eau
  ctx.lineWidth = width + 1 + w * 0.012 * ebb;
  ctx.stroke();
  smoothPath(ctx, d, sx, sy);
  ctx.strokeStyle = '#6f95a5';
  ctx.lineWidth = Math.max(2, (width + 1) * (1 - 0.55 * ebb));
  ctx.stroke();
  smoothPath(ctx, d, sx, sy);
  ctx.strokeStyle = '#a3cad6';
  ctx.lineWidth = Math.max(1, (width - 2) * (1 - 0.55 * ebb));
  ctx.stroke();
  ctx.restore();
}

/** Marée descendante sur une rive (polygone `cote`) : une bande de vase s'étale le long du bord, de plus en plus large. */
export function drawCoastTide(ctx: Ctx, d: SceneShape, sx: number, sy: number, w: number, ebb: number) {
  ctx.save();
  ctx.globalAlpha = Math.min(1, ebb * 8);
  ctx.lineJoin = 'round';
  polyPath(ctx, d, sx, sy);
  ctx.strokeStyle = 'rgba(143, 124, 85, 0.85)';
  ctx.lineWidth = w * 0.05 * ebb;
  ctx.stroke();
  polyPath(ctx, d, sx, sy);
  ctx.strokeStyle = '#b8a477';
  ctx.lineWidth = w * 0.028 * ebb;
  ctx.stroke();
  ctx.restore();
}

function drawRoad(ctx: Ctx, d: SceneShape, sx: number, sy: number, w: number) {
  const width = Math.max(5, w * 0.011);
  smoothPath(ctx, d, sx, sy);
  ctx.strokeStyle = 'rgba(120, 90, 52, 0.55)';
  ctx.lineWidth = width + 2;
  ctx.stroke();
  smoothPath(ctx, d, sx, sy);
  ctx.strokeStyle = '#d6c391';
  ctx.lineWidth = width;
  ctx.stroke();
  // Ornières.
  ctx.strokeStyle = 'rgba(120, 90, 52, 0.5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([width * 1.4, width * 0.7]);
  for (const dy of [-width * 0.22, width * 0.22]) {
    smoothPath(ctx, d, sx, sy);
    ctx.translate(0, dy);
    ctx.stroke();
    ctx.translate(0, -dy);
  }
  ctx.setLineDash([]);
}

function drawBridge(ctx: Ctx, d: SceneShape, sx: number, sy: number, w: number, biome: BattleBiome) {
  if (d.points.length < 2) return;
  const [a, b] = [d.points[0]!, d.points[d.points.length - 1]!];
  const x0 = a[0] * sx;
  const y0 = a[1] * sy;
  const x1 = b[0] * sx;
  const y1 = b[1] * sy;
  const len = Math.hypot(x1 - x0, y1 - y0);
  const thick = Math.max(6, w * 0.013);
  const stone = biome === 'mediterranee' || biome === 'montagne';
  ctx.save();
  ctx.translate(x0, y0);
  ctx.rotate(Math.atan2(y1 - y0, x1 - x0));
  ctx.fillStyle = stone ? '#b9b2a2' : '#9a6c3e';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.fillRect(-2, -thick / 2, len + 4, thick);
  ctx.strokeRect(-2, -thick / 2, len + 4, thick);
  // Planches (ou joints de pierre).
  ctx.strokeStyle = 'rgba(59, 42, 26, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 4; x < len; x += Math.max(4, thick * 0.55)) {
    ctx.moveTo(x, -thick / 2);
    ctx.lineTo(x, thick / 2);
  }
  ctx.stroke();
  // Garde-corps.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-2, -thick / 2);
  ctx.lineTo(len + 2, -thick / 2);
  ctx.moveTo(-2, thick / 2);
  ctx.lineTo(len + 2, thick / 2);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------------------------
// Rochers, maisons
// ---------------------------------------------------------------------------------------------------------------

function drawRock(ctx: Ctx, r: SceneRock, sx: number, sy: number) {
  const x = r.x * sx;
  const y = r.y * sy;
  const k = r.s * sx;
  const tone = ['#a39d91', '#948e82', '#b0aa9d'][r.v % 3]!;
  ctx.fillStyle = 'rgba(59, 42, 26, 0.2)';
  ctx.beginPath();
  ctx.ellipse(x + k * 0.15, y + k * 0.1, k * 0.8, k * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  const pts: [number, number][] = [
    [-0.8, 0],
    [-0.6, -0.55],
    [-0.1, -0.85],
    [0.5, -0.65],
    [0.8, -0.1],
    [0.55, 0.15],
    [-0.5, 0.15],
  ];
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(x + px * k, y + py * k) : ctx.lineTo(x + px * k, y + py * k)));
  ctx.closePath();
  ctx.fillStyle = tone;
  ctx.fill();
  // Face éclairée (haut-gauche) et face ombrée (bas-droite).
  ctx.fillStyle = 'rgba(255, 252, 240, 0.35)';
  ctx.beginPath();
  ctx.moveTo(x - 0.8 * k, y);
  ctx.lineTo(x - 0.6 * k, y - 0.55 * k);
  ctx.lineTo(x - 0.1 * k, y - 0.85 * k);
  ctx.lineTo(x - 0.1 * k, y - 0.2 * k);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(59, 42, 26, 0.3)';
  ctx.beginPath();
  ctx.moveTo(x + 0.5 * k, y - 0.65 * k);
  ctx.lineTo(x + 0.8 * k, y - 0.1 * k);
  ctx.lineTo(x + 0.55 * k, y + 0.15 * k);
  ctx.lineTo(x + 0.1 * k, y + 0.15 * k);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(x + px * k, y + py * k) : ctx.lineTo(x + px * k, y + py * k)));
  ctx.closePath();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.stroke();
}

const ROOF: Record<SceneHouse['roof'], string> = { tuile: '#b5502f', chaume: '#c4a45a', ardoise: '#6e6a66', terrasse: '#d2b886' };

function drawHouse(ctx: Ctx, hs: SceneHouse, sx: number, sy: number, biome: BattleBiome) {
  const x = hs.x * sx;
  const y = hs.y * sy;
  const wd = hs.s * sx;
  const wall = biome === 'desert' ? '#e0c995' : biome === 'montagne' ? '#d6cdb9' : '#efe2c4';
  const bh = wd * 0.5;
  ctx.fillStyle = 'rgba(59, 42, 26, 0.22)';
  ctx.beginPath();
  ctx.ellipse(x + wd * 0.1, y + 1, wd * 0.62, wd * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = INK;
  // Murs.
  ctx.fillStyle = wall;
  ctx.fillRect(x - wd / 2, y - bh, wd, bh);
  ctx.strokeRect(x - wd / 2, y - bh, wd, bh);
  // Toit.
  ctx.fillStyle = ROOF[hs.roof];
  ctx.beginPath();
  if (hs.roof === 'terrasse') {
    ctx.rect(x - wd / 2 - 1, y - bh - wd * 0.12, wd + 2, wd * 0.14);
  } else {
    ctx.moveTo(x - wd * 0.6, y - bh);
    ctx.lineTo(x - wd * 0.3, y - bh - wd * 0.38);
    ctx.lineTo(x + wd * 0.3, y - bh - wd * 0.38);
    ctx.lineTo(x + wd * 0.6, y - bh);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Porte.
  ctx.fillStyle = '#6b4526';
  ctx.fillRect(x - wd * 0.08, y - bh * 0.62, wd * 0.16, bh * 0.62);
  if (hs.tower) {
    // Clocher : tour étroite coiffée d'une flèche.
    const tw = wd * 0.5;
    const th = wd * 1.5;
    const tx = x + wd * 0.55;
    ctx.fillStyle = wall;
    ctx.fillRect(tx - tw / 2, y - th, tw, th);
    ctx.strokeRect(tx - tw / 2, y - th, tw, th);
    ctx.fillStyle = hs.roof === 'terrasse' ? '#b8995f' : '#b5502f';
    ctx.beginPath();
    ctx.moveTo(tx - tw * 0.65, y - th);
    ctx.lineTo(tx, y - th - wd * 0.8);
    ctx.lineTo(tx + tw * 0.65, y - th);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.fillRect(tx - tw * 0.12, y - th * 0.8, tw * 0.24, th * 0.22);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Étiquettes (anti-collision)
// ---------------------------------------------------------------------------------------------------------------

function drawLabels(ctx: Ctx, shapes: SceneShape[], sx: number, sy: number, w: number, h: number) {
  const fs = Math.max(10, w * 0.016);
  ctx.font = `italic ${fs}px "Cormorant Garamond", Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
  for (const d of shapes) {
    if (!d.label || d.points.length === 0) continue;
    const line = d.kind === 'riviere' || d.kind === 'route' || d.kind === 'pont';
    const mid = line
      ? d.points[Math.floor(d.points.length / 2)]!
      : [d.points.reduce((s, p) => s + p[0], 0) / d.points.length, d.points.reduce((s, p) => s + p[1], 0) / d.points.length];
    const tw = ctx.measureText(d.label).width;
    const x = Math.max(tw / 2 + 2, Math.min(w - tw / 2 - 2, mid[0]! * sx));
    let y = mid[1]! * sy - (line ? fs * 0.9 : 0);
    const hit = (yy: number) => placed.some((b) => x - tw / 2 < b.x1 && x + tw / 2 > b.x0 && yy - fs < b.y1 && yy + fs * 0.3 > b.y0);
    // Une étiquette qui en chevauche une autre descend d'une ligne (ou monte si elle sort du bas).
    const dir = y + fs * 3 > h ? -1 : 1;
    for (let i = 0; i < 8 && hit(y); i++) y += dir * fs * 1.15;
    y = Math.max(fs + 2, Math.min(h - 4, y));
    placed.push({ x0: x - tw / 2, x1: x + tw / 2, y0: y - fs, y1: y + fs * 0.3 });
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(240, 228, 196, 0.85)';
    ctx.strokeText(d.label, x, y);
    ctx.fillStyle = 'rgba(70, 50, 30, 0.9)';
    ctx.fillText(d.label, x, y);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Arbres : sprites prérendus, dessinés avec les figurines
// ---------------------------------------------------------------------------------------------------------------

const TW = 96;
const TH = 120;
const treeSprites = new Map<string, HTMLCanvasElement>();
const LEAF: Record<TreeKind, string[]> = {
  feuillu: ['#6e9a48', '#80a955', '#5c8741'],
  conifere: ['#3f6b46', '#4a7a4c', '#365e3e'],
  olivier: ['#8d9c70', '#7e9068', '#9aa87c'],
  pin: ['#587a40', '#4f7038', '#668848'],
  palmier: ['#5f9444', '#6fa24e', '#528338'],
};

function treeSprite(kind: TreeKind, v: number): HTMLCanvasElement {
  const key = `${kind}${v}`;
  const hit = treeSprites.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = TW;
  c.height = TH;
  const g = c.getContext('2d')!;
  const leaf = LEAF[kind][v % 3]!;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.lineWidth = 2.4;
  g.strokeStyle = INK;
  // Ombre au pied.
  g.fillStyle = 'rgba(59, 42, 26, 0.28)';
  g.beginPath();
  g.ellipse(TW / 2 + 4, TH - 6, kind === 'pin' ? 30 : 24, 6, 0, 0, Math.PI * 2);
  g.fill();
  const trunk = (x0: number, w0: number, top: number, color = '#6b4526') => {
    g.fillStyle = color;
    g.beginPath();
    g.rect(x0 - w0 / 2, top, w0, TH - 6 - top);
    g.fill();
    g.stroke();
  };
  const blob = (x: number, y: number, r: number) => {
    g.fillStyle = leaf;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  };
  const shade = (x: number, y: number, r: number) => {
    // Croissant ombré (bas-droite) et lumière (haut-gauche), clippés à la couronne.
    g.save();
    g.beginPath();
    g.arc(x, y, r - 1, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = 'rgba(30, 50, 25, 0.28)';
    g.beginPath();
    g.arc(x + r * 0.45, y + r * 0.45, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255, 255, 220, 0.22)';
    g.beginPath();
    g.arc(x - r * 0.4, y - r * 0.45, r * 0.55, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  if (kind === 'feuillu') {
    trunk(TW / 2, 10, 70);
    blob(TW / 2 - 15, 56, 21);
    blob(TW / 2 + 15, 56, 21);
    blob(TW / 2, 34, 26);
    shade(TW / 2, 42, 34);
  } else if (kind === 'conifere') {
    trunk(TW / 2, 8, 94);
    g.fillStyle = leaf;
    for (const [top, half, base] of [
      [50, 30, 98],
      [28, 25, 74],
      [6, 19, 50],
    ] as const) {
      g.beginPath();
      g.moveTo(TW / 2, top);
      g.lineTo(TW / 2 + half, base - 14);
      g.lineTo(TW / 2 - half, base - 14);
      g.closePath();
      g.fill();
      g.stroke();
    }
    g.fillStyle = 'rgba(255, 255, 220, 0.18)';
    g.beginPath();
    g.moveTo(TW / 2, 8);
    g.lineTo(TW / 2 - 14, 34);
    g.lineTo(TW / 2 - 4, 34);
    g.closePath();
    g.fill();
  } else if (kind === 'olivier') {
    g.fillStyle = '#7b5a38';
    g.beginPath();
    g.moveTo(TW / 2 - 7, TH - 6);
    g.quadraticCurveTo(TW / 2 - 10, 78, TW / 2 - 12, 62);
    g.lineTo(TW / 2 + 2, 66);
    g.quadraticCurveTo(TW / 2 + 5, 84, TW / 2 + 7, TH - 6);
    g.closePath();
    g.fill();
    g.stroke();
    blob(TW / 2 - 14, 54, 17);
    blob(TW / 2 + 14, 54, 17);
    blob(TW / 2, 42, 20);
    shade(TW / 2, 48, 28);
  } else if (kind === 'pin') {
    // Pin parasol : fût courbe, couronne plate.
    g.fillStyle = '#7b5a38';
    g.beginPath();
    g.moveTo(TW / 2 - 4, TH - 6);
    g.quadraticCurveTo(TW / 2 + 8, 80, TW / 2 - 2, 44);
    g.lineTo(TW / 2 + 5, 44);
    g.quadraticCurveTo(TW / 2 + 14, 80, TW / 2 + 6, TH - 6);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = leaf;
    g.beginPath();
    g.ellipse(TW / 2, 36, 40, 17, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = 'rgba(30, 50, 25, 0.25)';
    g.beginPath();
    g.ellipse(TW / 2 + 6, 42, 32, 9, 0, 0, Math.PI);
    g.fill();
  } else {
    // Palmier : fût courbe et palmes en éventail.
    g.strokeStyle = INK;
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(TW / 2, TH - 6);
    g.quadraticCurveTo(TW / 2 + 10, 70, TW / 2 + 4, 34);
    g.stroke();
    g.strokeStyle = '#8a6238';
    g.lineWidth = 4;
    g.stroke();
    g.lineWidth = 2.4;
    g.strokeStyle = INK;
    for (const a of [-2.7, -2.1, -1.55, -1.0, -0.4, 0.15]) {
      const ex = TW / 2 + 4 + Math.cos(a) * 36;
      const ey = 34 + Math.sin(a) * 26 + 10;
      g.fillStyle = leaf;
      g.beginPath();
      g.moveTo(TW / 2 + 4, 34);
      g.quadraticCurveTo(TW / 2 + 4 + Math.cos(a) * 20, 34 + Math.sin(a) * 26 - 8, ex, ey);
      g.quadraticCurveTo(TW / 2 + 4 + Math.cos(a) * 18, 34 + Math.sin(a) * 18 + 6, TW / 2 + 4, 36);
      g.fill();
      g.stroke();
    }
  }
  treeSprites.set(key, c);
  return c;
}

const TREE_ASPECT = TW / TH;

/** Dessine un arbre (pied en (x, y) du terrain). Appelé par render.ts, dans l'ordre de profondeur. */
export function drawTree(ctx: Ctx, t: SceneTree, sx: number, sy: number) {
  const hpx = t.s * sy * 1.1;
  const wpx = hpx * TREE_ASPECT;
  ctx.drawImage(treeSprite(t.kind, t.v), t.x * sx - wpx / 2, t.y * sy - hpx * 0.95, wpx, hpx);
}
