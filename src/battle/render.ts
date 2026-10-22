/** Dessin de la bataille sur un canvas 2D : fond, décor, figurines triées par profondeur, poussière. */
import type { BattleBiome, BattleScenario, BattleUnitKind } from '../types-battle';
import { FW_T, hash01, TERRAIN_H, TERRAIN_W, type BattleEffect, type BattleFigure, type BattleFrame } from './engine';
import { drawCannon } from './cannon';
import { PAD, SPRITE_W } from './poses';
import { buildScenery, drawTree, type Scenery } from './scenery';
import type { FactionSprites } from './sprites';
import type { SoldierPose } from './poses';
import {
  CHARIOT_DRIVER,
  coatOf,
  drawBrulot,
  drawBust,
  drawChariot,
  drawElephant,
  drawFallenChariot,
  drawFallenElephant,
  drawFallenHorse,
  drawHorse,
  ELEPHANT_NECK,
  HORSE_BACK,
} from './mounts';
import { drawGalley, drawSailer } from './ships';

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

/** Taille de dessin (en largeurs de fantassin) et demi-largeur de l'ombre au sol, selon la nature de l'unité. */
const SIZE_BY_KIND: Record<BattleUnitKind, number> = {
  infanterie: 1,
  archers: 1,
  cavalerie: 1,
  'archers-montes': 1,
  elephants: 1.7,
  chars: 1,
  navires: 1,
  brulots: 1,
  artillerie: 1,
};
const SHADOW_BY_KIND: Record<BattleUnitKind, number> = {
  infanterie: 0.42,
  archers: 0.42,
  cavalerie: 0.8,
  'archers-montes': 0.8,
  elephants: 1.1,
  chars: 1.35,
  navires: 0.42,
  brulots: 0.8,
  artillerie: 0.42,
};
/** Longueur d'une coque en unités de terrain. */
const SHIP_LEN_T = 8.8;
/** Seuil d'année : galères à rames avant, vaisseaux à voiles carrées ensuite. */
const SAIL_YEAR = 1600;

let sceneryCache: { scenario: BattleScenario; biome: BattleBiome; scenery: Scenery } | null = null;

/** Paysage de la bataille, reconstruit seulement au changement de bataille, de biome ou de taille. */
function sceneryFor(scenario: BattleScenario, biome: BattleBiome, w: number, h: number, dpr: number): Scenery {
  const c = sceneryCache;
  if (c && c.scenario === scenario && c.biome === biome && c.scenery.w === w && c.scenery.h === h && c.scenery.dpr === dpr) return c.scenery;
  const scenery = buildScenery(scenario, biome, w, h, dpr);
  sceneryCache = { scenario, biome, scenery };
  return scenery;
}

/** Image du soldat selon sa pose ; les armes longues (sarisse, pique) et l'arc de l'archer monté ont leurs propres poses. */
function imageFor(sp: FactionSprites, f: BattleFigure, dead: boolean): HTMLImageElement {
  if (dead) return sp.vaincu[f.frame];
  let pose: SoldierPose = f.pose === 'tir' ? 'vise' : f.pose; // la pose « tir » garde l'arme épaulée (comme « vise »)
  if (f.pike) pose = pose === 'baionnette' ? 'sarisse' : 'pique';
  else if (f.kind === 'archers-montes' && pose === 'vise') pose = 'arc';
  return sp.pose(pose, f.frame) ?? sp.marche[f.frame];
}

export function drawBattle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scenario: BattleScenario,
  frame: BattleFrame,
  sprites: FactionSprites[],
  biome: BattleBiome = 'prairie',
  year?: number,
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

  // Coques : un navire par groupe d'équipage (unités `navires`) ; toute autre unité en mer garde une coque commune.
  const ships = new Map<string, { x: number; y: number; n: number; facing: 1 | -1; alive: number; moving: boolean }>();
  const groups = new Map<string, { xs: number[]; ys: number[] }>();
  for (const f of frame.figures) {
    if (f.ship) {
      const s = ships.get(f.ship) ?? { x: 0, y: 0, n: 0, facing: f.facing, alive: 0, moving: false };
      s.x += f.x;
      s.y += f.y;
      s.n++;
      if (f.state !== 'mort') s.alive++;
      if (!f.idle) s.moving = true;
      ships.set(f.ship, s);
      continue;
    }
    const u = unitById.get(f.unit);
    if (!u || u.kind === 'navires' || u.kind === 'brulots' || !sea) continue;
    const g = groups.get(f.unit) ?? { xs: [], ys: [] };
    g.xs.push(f.x);
    g.ys.push(f.y);
    groups.set(f.unit, g);
  }
  for (const [id, g] of groups) drawHull(ctx, g, sx, sy, w, frame.t, id);
  const drawnShips = new Set<string>();

  drawDust(ctx, frame, sx, sy, w);

  const fw = FW_T * sx;
  for (const f of sorted) {
    // Un arbre plus au fond que la figurine est dessiné avant elle : le soldat passe devant ou derrière.
    while (nextTree < trees.length && trees[nextTree]!.y <= f.y) drawTree(ctx, trees[nextTree++]!, sx, sy);
    const sp = sprites[f.army];
    if (!sp) continue;
    if (f.ship && !drawnShips.has(f.ship)) {
      drawnShips.add(f.ship);
      const s = ships.get(f.ship)!;
      ctx.save();
      ctx.translate((s.x / s.n) * sx, (s.y / s.n) * sy);
      if (s.facing === -1) ctx.scale(-1, 1);
      const opts = { color: sp.color, t: frame.t, rowing: s.moving, seed: hash01(f.ship) * 6.28, wreck: s.alive === 0 };
      if ((year ?? 0) < SAIL_YEAR) drawGalley(ctx, SHIP_LEN_T * sx, opts);
      else drawSailer(ctx, SHIP_LEN_T * sx, opts);
      ctx.restore();
    }
    const dw = fw * (SIZE_BY_KIND[f.kind] ?? 1);
    const dh = dw * 1.25;
    let px = f.x * sx;
    const py = f.y * sy;
    let alpha = 1;
    const dead = f.state === 'mort';
    const img = imageFor(sp, f, dead);
    const mount = f.kind === 'cavalerie' || f.kind === 'archers-montes' || f.kind === 'elephants' || f.kind === 'chars' || f.kind === 'brulots';
    if (f.state === 'combat' && f.pose === 'marche' && !mount && !f.pike) px += Math.sin(frame.t * 14 + hash01(f.id) * 6.28) * dw * 0.12;
    // Mêlée : petit va-et-vient d'estoc dans le sens de la figurine.
    if (f.pose === 'baionnette' && f.state === 'combat' && !mount) px += f.facing * Math.max(0, Math.sin(frame.t * 7 + hash01(f.id) * 6.28)) * dw * 0.14;
    if (f.state === 'fuite') {
      px -= f.facing * dw * 0.25; // avance vers son bord
      alpha = 0.75;
    }
    // Ombre aux couleurs du camp.
    ctx.globalAlpha = dead ? 0.25 : 0.4;
    ctx.fillStyle = sp.color;
    ctx.beginPath();
    ctx.ellipse(px, py, dw * (SHADOW_BY_KIND[f.kind] ?? 0.42), dw * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.save();
    ctx.translate(px, py);
    if (f.facing === -1) ctx.scale(-1, 1);
    if (mount) {
      drawMount(ctx, f, sp, img, dw, dead, frame.t);
      ctx.restore();
      ctx.globalAlpha = 1;
      continue;
    }
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
    if (f.roof) drawRoof(ctx, k, sp.color, f.id);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  while (nextTree < trees.length) drawTree(ctx, trees[nextTree++]!, sx, sy);
  drawEffects(ctx, frame.effects, sx, sy, fw);
}

/** Bouclier du toit de la tortue, au-dessus de la tête : aplat aux couleurs du camp, bande claire et umbo doré. */
function drawRoof(ctx: CanvasRenderingContext2D, k: number, color: string, id: string) {
  const wdt = 34 * k;
  const hgt = 7 * k;
  const tilt = (hash01(id) - 0.5) * 0.12;
  ctx.save();
  ctx.translate(0, -35.5 * k);
  ctx.rotate(tilt);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#3b2a1a';
  ctx.lineWidth = Math.max(1, k * 1.2);
  ctx.beginPath();
  ctx.roundRect(-wdt / 2, -hgt / 2, wdt, hgt, hgt * 0.4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(244, 239, 224, 0.75)';
  ctx.fillRect(-wdt / 2 + hgt * 0.4, -hgt * 0.12, wdt - hgt * 0.8, hgt * 0.24);
  ctx.fillStyle = '#e0b43a';
  ctx.beginPath();
  ctx.arc(0, 0, hgt * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Cheval et cavalier, éléphant et cornac, char et conducteur, ou brûlot. L'origine est au sol, la figurine regarde à droite. */
function drawMount(ctx: CanvasRenderingContext2D, f: BattleFigure, sp: FactionSprites, img: HTMLImageElement, dw: number, dead: boolean, t: number) {
  const kr = (dw / 32) * 0.92; // taille du cavalier
  const mirrorRider = f.aim !== f.facing; // tir parthe : le cavalier se retourne sur sa selle
  const rider = (image: HTMLImageElement, k: number, cropU: number, x: number, y: number, mirror = false) => {
    ctx.save();
    if (mirror) ctx.scale(-1, 1);
    drawBust(ctx, image, k, cropU, mirror ? -x : x, y);
    ctx.restore();
  };
  if (f.kind === 'brulots') {
    drawBrulot(ctx, dw, t, f.id, dead);
    return;
  }
  if (f.kind === 'cavalerie' || f.kind === 'archers-montes') {
    const coat = coatOf(f.id);
    if (dead) {
      ctx.globalAlpha *= 0.65;
      drawFallenHorse(ctx, dw, coat);
      // Le cavalier tombé gît près de sa monture.
      ctx.drawImage(img, -(16 + PAD) * kr - dw * 0.7, -dw * 0.62, SPRITE_W * kr, dw * 0.78);
      return;
    }
    drawHorse(ctx, dw, { coat, frame: f.frame, idle: f.idle, blanket: sp.color, t });
    const bounce = !f.idle && f.frame === 0 ? -0.04 : 0;
    rider(img, kr, 27.5, -dw * 0.06, -dw * (HORSE_BACK * 0.97 - bounce), mirrorRider);
    return;
  }
  if (f.kind === 'elephants') {
    if (dead) {
      ctx.globalAlpha *= 0.65;
      drawFallenElephant(ctx, dw);
      return;
    }
    const howdah = sp.faction === 'indiens';
    drawElephant(ctx, dw, { frame: f.frame, idle: f.idle, blanket: sp.color, t, howdah, seed: hash01(f.id) });
    const kc = (dw / 32) * 0.5;
    rider(img, kc, 27.5, dw * ELEPHANT_NECK.x, -dw * (ELEPHANT_NECK.y - 0.02));
    if (howdah) {
      // L'archer de la tour : même peuple, arc bandé.
      const bow = sp.pose('arc', f.frame) ?? img;
      rider(bow, kc * 1.15, 27.5, -dw * 0.12, -dw * 1.5, mirrorRider);
    }
    return;
  }
  // chars
  const coat = coatOf(f.id);
  if (dead) {
    ctx.globalAlpha *= 0.65;
    drawFallenChariot(ctx, dw, coat, sp.color);
    return;
  }
  drawChariot(ctx, dw, {
    coat,
    frame: f.frame,
    idle: f.idle,
    blanket: sp.color,
    t,
    scythes: sp.faction === 'parthes-perses',
    roll: f.idle ? 0.3 : t * 9 + hash01(f.id) * 6,
    id: f.id,
  });
  rider(img, kr, 31, dw * CHARIOT_DRIVER.x, -dw * CHARIOT_DRIVER.y);
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
    if (f.state !== 'combat' || f.kind === 'navires' || f.kind === 'brulots') continue;
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
