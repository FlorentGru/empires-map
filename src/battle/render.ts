/** Dessin de la bataille sur un canvas 2D : fond, décor, figurines triées par profondeur, poussière. */
import type { BattleDecor, BattleScenario, BattleTerrain } from '../types-battle';
import { hash01, TERRAIN_H, TERRAIN_W, type BattleFrame } from './engine';
import type { FactionSprites } from './sprites';

const GROUND: Record<BattleTerrain, string> = {
  plaine: '#ecdcb4',
  colline: '#e6d3a4',
  foret: '#e2d6ab',
  riviere: '#ebdcb6',
  mer: '#a9c2cb',
  ville: '#e3d2ae',
};

const DECOR_FILL: Record<BattleDecor['kind'], string> = {
  riviere: '#8fb2c0',
  route: '#cdb98c',
  colline: 'rgba(176, 140, 84, 0.35)',
  foret: 'rgba(70, 112, 62, 0.35)',
  cote: 'rgba(140, 170, 180, 0.55)',
  marais: 'rgba(110, 138, 104, 0.35)',
  village: 'rgba(120, 82, 56, 0.3)',
};

/** Ajuste la taille interne du canvas à sa taille affichée (devicePixelRatio) ; renvoie le contexte en pixels CSS. */
export function fitCanvas(canvas: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; w: number; h: number } | null {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

const SIZE_BY_KIND = { infanterie: 1, archers: 1, cavalerie: 1.18, elephants: 1.6, navires: 1 } as const;

export function drawBattle(ctx: CanvasRenderingContext2D, w: number, h: number, scenario: BattleScenario, frame: BattleFrame, sprites: FactionSprites[]) {
  const sx = w / TERRAIN_W;
  const sy = h / TERRAIN_H;
  drawGround(ctx, w, h, scenario.terrain);
  for (const d of scenario.decor ?? []) drawDecor(ctx, d, sx, sy, w);

  const sorted = [...frame.figures].sort((a, b) => a.y - b.y);
  const unitById = new Map(scenario.units.map((u) => [u.id, u]));
  const sea = scenario.terrain === 'mer';

  // Coques sous les groupes (navires, ou toute unité en mer).
  const groups = new Map<string, { xs: number[]; ys: number[] }>();
  for (const f of frame.figures) {
    const u = unitById.get(f.unit);
    if (!u || !(u.kind === 'navires' || sea)) continue;
    const g = groups.get(f.unit) ?? { xs: [], ys: [] };
    g.xs.push(f.x);
    g.ys.push(f.y);
    groups.set(f.unit, g);
  }
  for (const [id, g] of groups) drawHull(ctx, g, sx, sy, w, frame.t, id);

  drawDust(ctx, frame, sx, sy, w);

  const fw = w * 0.022;
  for (const f of sorted) {
    const sp = sprites[f.army];
    if (!sp) continue;
    const dw = fw * (SIZE_BY_KIND[f.kind] ?? 1);
    const dh = dw * 1.25;
    let px = f.x * sx;
    const py = f.y * sy;
    let alpha = 1;
    const img = f.state === 'mort' ? sp.vaincu[f.frame] : sp.marche[f.frame];
    if (f.state === 'combat') px += Math.sin(frame.t * 14 + hash01(f.id) * 6.28) * dw * 0.12;
    if (f.state === 'fuite') {
      px -= f.facing * dw * 0.25; // avance vers son bord
      alpha = 0.75;
    }
    // Ombre aux couleurs du camp.
    ctx.globalAlpha = f.state === 'mort' ? 0.25 : 0.4;
    ctx.fillStyle = sp.color;
    ctx.beginPath();
    ctx.ellipse(px, py, dw * 0.42, dw * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.save();
    ctx.translate(px, py);
    if (f.facing === -1) ctx.scale(-1, 1);
    ctx.drawImage(img, -dw / 2, -dh * 0.92, dw, dh);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number, terrain: BattleTerrain) {
  ctx.fillStyle = GROUND[terrain];
  ctx.fillRect(0, 0, w, h);
  // Taches de papier déterministes, à bord fondu (un disque net ferait des cercles visibles).
  for (let i = 0; i < 24; i++) {
    const x = hash01(`tx${i}`) * w;
    const y = hash01(`ty${i}`) * h;
    const r = (0.02 + hash01(`tr${i}`) * 0.05) * w;
    const spot = ctx.createRadialGradient(x, y, 0, x, y, r);
    spot.addColorStop(0, `rgba(120, 90, 50, ${0.03 + hash01(`t${i}`) * 0.03})`);
    spot.addColorStop(1, 'rgba(120, 90, 50, 0)');
    ctx.fillStyle = spot;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(60, 40, 20, 0)');
  g.addColorStop(1, 'rgba(60, 40, 20, 0.28)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawDecor(ctx: CanvasRenderingContext2D, d: BattleDecor, sx: number, sy: number, w: number) {
  if (d.points.length === 0) return;
  const line = d.kind === 'riviere' || d.kind === 'route';
  ctx.beginPath();
  d.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * sx, y * sy) : ctx.lineTo(x * sx, y * sy)));
  if (line) {
    ctx.strokeStyle = DECOR_FILL[d.kind];
    ctx.lineWidth = d.kind === 'riviere' ? w * 0.018 : w * 0.01;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  } else {
    ctx.closePath();
    ctx.fillStyle = DECOR_FILL[d.kind];
    ctx.fill();
    ctx.strokeStyle = 'rgba(90, 64, 36, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  if (d.label) {
    const cx = d.points.reduce((s, p) => s + p[0], 0) / d.points.length;
    const cy = d.points.reduce((s, p) => s + p[1], 0) / d.points.length;
    ctx.font = `italic ${Math.max(10, w * 0.016)}px "Cormorant Garamond", Georgia, serif`;
    ctx.fillStyle = 'rgba(70, 50, 30, 0.8)';
    ctx.textAlign = 'center';
    ctx.fillText(d.label, cx * sx, cy * sy);
  }
}

function drawHull(ctx: CanvasRenderingContext2D, g: { xs: number[]; ys: number[] }, sx: number, sy: number, w: number, t: number, id: string) {
  const x0 = Math.min(...g.xs) * sx;
  const x1 = Math.max(...g.xs) * sx;
  const y0 = Math.min(...g.ys) * sy;
  const y1 = Math.max(...g.ys) * sy;
  const pad = w * 0.02;
  const bob = Math.sin(t * 2 + hash01(id) * 6) * 1.5;
  ctx.fillStyle = '#6b4526';
  ctx.strokeStyle = '#3b2a1a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x0 - pad, y0 - pad * 0.3 + bob);
  ctx.lineTo(x1 + pad, y0 - pad * 0.3 + bob);
  ctx.quadraticCurveTo(x1 + pad * 1.2, y1 + pad * 1.2 + bob, (x0 + x1) / 2, y1 + pad * 1.4 + bob);
  ctx.quadraticCurveTo(x0 - pad * 1.2, y1 + pad * 1.2 + bob, x0 - pad, y0 - pad * 0.3 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** Poussière : petits cercles translucides qui montent et s'estompent autour des unités au combat. */
function drawDust(ctx: CanvasRenderingContext2D, frame: BattleFrame, sx: number, sy: number, w: number) {
  const units = new Map<string, { x: number; y: number; n: number }>();
  for (const f of frame.figures) {
    if (f.state !== 'combat') continue;
    const u = units.get(f.unit) ?? { x: 0, y: 0, n: 0 };
    u.x += f.x;
    u.y += f.y;
    u.n++;
    units.set(f.unit, u);
  }
  for (const [id, u] of units) {
    const cx = u.x / u.n;
    const cy = u.y / u.n;
    for (let i = 0; i < 6; i++) {
      const life = (frame.t * 0.5 + hash01(`${id}d${i}`)) % 1;
      const ox = (hash01(`${id}dx${i}`) - 0.5) * 8;
      const oy = (hash01(`${id}dy${i}`) - 0.5) * 6;
      ctx.fillStyle = `rgba(150, 120, 80, ${0.22 * (1 - life)})`;
      ctx.beginPath();
      ctx.arc((cx + ox) * sx, (cy + oy) * sy - life * w * 0.015, w * (0.008 + life * 0.014), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
