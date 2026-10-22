/** Dessin de la bataille sur un canvas 2D : fond, décor, figurines triées par profondeur, poussière. */
import type { BattleBiome, BattleScenario } from '../types-battle';
import { FW_T, hash01, TERRAIN_H, TERRAIN_W, type BattleEffect, type BattleFrame } from './engine';
import { drawCannon } from './cannon';
import { PAD, SPRITE_W } from './poses';
import { buildScenery, drawTree, type Scenery } from './scenery';
import type { FactionSprites } from './sprites';

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

const SIZE_BY_KIND = { infanterie: 1, archers: 1, cavalerie: 1.18, elephants: 1.6, navires: 1, artillerie: 1 } as const;

let sceneryCache: { scenario: BattleScenario; biome: BattleBiome; scenery: Scenery } | null = null;

/** Paysage de la bataille, reconstruit seulement au changement de bataille, de biome ou de taille. */
function sceneryFor(scenario: BattleScenario, biome: BattleBiome, w: number, h: number, dpr: number): Scenery {
  const c = sceneryCache;
  if (c && c.scenario === scenario && c.biome === biome && c.scenery.w === w && c.scenery.h === h && c.scenery.dpr === dpr) return c.scenery;
  const scenery = buildScenery(scenario, biome, w, h, dpr);
  sceneryCache = { scenario, biome, scenery };
  return scenery;
}

export function drawBattle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scenario: BattleScenario,
  frame: BattleFrame,
  sprites: FactionSprites[],
  biome: BattleBiome = 'prairie',
) {
  const sx = w / TERRAIN_W;
  const sy = h / TERRAIN_H;
  const scenery = sceneryFor(scenario, biome, w, h, ctx.getTransform().a);
  // Sol et éléments bas : un seul drawImage par image.
  ctx.drawImage(scenery.ground, 0, 0, w, h);
  const trees = scenery.layout.trees;
  let nextTree = 0;

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

  const fw = FW_T * sx;
  for (const f of sorted) {
    // Un arbre plus au fond que la figurine est dessiné avant elle : le soldat passe devant ou derrière.
    while (nextTree < trees.length && trees[nextTree]!.y <= f.y) drawTree(ctx, trees[nextTree++]!, sx, sy);
    const sp = sprites[f.army];
    if (!sp) continue;
    const dw = fw * (SIZE_BY_KIND[f.kind] ?? 1);
    const dh = dw * 1.25;
    let px = f.x * sx;
    const py = f.y * sy;
    let alpha = 1;
    const dead = f.state === 'mort';
    // Pose de combat si son image est prête ; la pose « tir » garde l'arme épaulée (comme « vise »).
    const pose = f.pose === 'tir' ? 'vise' : f.pose;
    const img = dead ? sp.vaincu[f.frame] : (sp.pose(pose, f.frame) ?? sp.marche[f.frame]);
    if (f.state === 'combat' && f.pose === 'marche') px += Math.sin(frame.t * 14 + hash01(f.id) * 6.28) * dw * 0.12;
    // Mêlée : petit va-et-vient d'estoc dans le sens du camp.
    if (f.pose === 'baionnette' && f.state === 'combat') px += f.facing * Math.max(0, Math.sin(frame.t * 7 + hash01(f.id) * 6.28)) * dw * 0.14;
    if (f.state === 'fuite') {
      px -= f.facing * dw * 0.25; // avance vers son bord
      alpha = 0.75;
    }
    // Ombre aux couleurs du camp.
    ctx.globalAlpha = dead ? 0.25 : 0.4;
    ctx.fillStyle = sp.color;
    ctx.beginPath();
    ctx.ellipse(px, py, dw * 0.42, dw * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.save();
    ctx.translate(px, py);
    if (f.facing === -1) ctx.scale(-1, 1);
    if (f.kind === 'artillerie') {
      // Une figurine = une pièce et son servant (debout derrière l'affût).
      ctx.save();
      if (dead) ctx.rotate(-0.12);
      ctx.globalAlpha = dead ? 0.55 : alpha;
      drawCannon(ctx, dw * 1.5, f.recoil, f.recoil * 2 + hash01(f.id));
      ctx.restore();
      ctx.translate(-dw * 1.1, dh * 0.04);
    }
    // Le dessin est large (marges PAD) : on le recale sur l'ancre habituelle (milieu des 32 unités).
    const k = dw / 32;
    ctx.drawImage(img, -(16 + PAD) * k, -dh * 0.92, SPRITE_W * k, dh);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  while (nextTree < trees.length) drawTree(ctx, trees[nextTree++]!, sx, sy);
  drawEffects(ctx, frame.effects, sx, sy, fw);
}

let puffSprite: HTMLCanvasElement | null = null;
/** Bouffée de fumée prérendue : dégradé radial à bord doux (jamais un disque net), teintée par globalAlpha. */
function puff(): HTMLCanvasElement {
  if (puffSprite) return puffSprite;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  // Cœur blanc, bord gris : sur le parchemin crème, une fumée toute claire disparaissait.
  grad.addColorStop(0, 'rgba(250, 249, 245, 1)');
  grad.addColorStop(0.5, 'rgba(205, 203, 198, 0.8)');
  grad.addColorStop(1, 'rgba(160, 158, 152, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  puffSprite = c;
  return c;
}

/** Boulets, flèches, fumées puis éclairs, par-dessus les figurines : la fumée voile la ligne. */
function drawEffects(ctx: CanvasRenderingContext2D, effects: BattleEffect[], sx: number, sy: number, fw: number) {
  const at = (e: { x: number; y: number; z: number }): [number, number] => [e.x * sx, e.y * sy - e.z * fw];
  for (const e of effects) {
    if (e.kind === 'boulet') {
      const [x, y] = at(e);
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#3b2a1a';
      ctx.beginPath();
      ctx.ellipse(e.x * sx, e.y * sy, fw * 0.12, fw * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#1f1a14';
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.5, fw * 0.11), 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'fleche' && e.tail) {
      const [x, y] = at(e);
      const [x0, y0] = at(e.tail);
      ctx.strokeStyle = '#3b2a1a';
      ctx.lineWidth = Math.max(1, fw * 0.05);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }
  const img = puff();
  for (const e of effects) {
    if (e.kind !== 'fumee') continue;
    const [x, y] = at(e);
    const r = e.size * fw * 0.5;
    ctx.globalAlpha = e.alpha;
    ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
  for (const e of effects) {
    if (e.kind !== 'eclair') continue;
    const [x, y] = at(e);
    const r = e.size * fw * 0.5;
    // Étoile à huit pointes jaune-orangé, cœur clair.
    for (const [rad, color] of [
      [r, '#ff9d2e'],
      [r * 0.55, '#fff0a6'],
    ] as const) {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI) / 8 + hash01(`eclair${e.x | 0}`) * 0.4;
        const rr = i % 2 === 0 ? rad : rad * 0.38;
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
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
