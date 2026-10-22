/**
 * Montures et engins de la fenêtre de bataille, dessinés au canvas (vue de côté, tournés vers la droite : le miroir se fait
 * avec ctx.scale avant l'appel) : cheval, éléphant de guerre, char, brûlot. Style des figurines : contour #3b2a1a, aplats.
 * Toutes les fonctions dessinent à partir du sol, au centre de la bête (y vers le haut = négatif), en unités `u` = largeur
 * d'une figurine en pixels : la bête, avec son cavalier, reste donc à l'échelle des fantassins.
 */
import { hash01 } from './hash';
import { PAD, SPRITE_W } from './poses';

const INK = '#3b2a1a';

type Pt = [number, number];

/** Robes des chevaux : bai, alezan, gris, noir (choisie par hachage de l'identifiant de la figurine). */
const COATS = [
  { body: '#8a4b24', far: '#6d3a1b', mane: '#2b1a10' }, // bai
  { body: '#b4642a', far: '#8f4e20', mane: '#8a4a1e' }, // alezan
  { body: '#b9bdc0', far: '#979ca0', mane: '#8a8e92' }, // gris
  { body: '#37322f', far: '#24201e', mane: '#14110f' }, // noir
] as const;
export type Coat = (typeof COATS)[number];
export const coatOf = (id: string): Coat => COATS[Math.floor(hash01(`${id}c`) * COATS.length) % COATS.length]!;

/** Poses des pattes (hanche, genou, sabot) : galop allongé, galop ramassé, à l'arrêt. */
const LEGS = {
  g0: {
    far: [
      [
        [0.34, -0.62],
        [0.44, -0.38],
        [0.6, -0.1],
      ],
      [
        [-0.36, -0.62],
        [-0.34, -0.36],
        [-0.46, -0.06],
      ],
    ],
    near: [
      [
        [0.38, -0.62],
        [0.6, -0.48],
        [0.86, -0.34],
      ],
      [
        [-0.4, -0.62],
        [-0.58, -0.42],
        [-0.86, -0.22],
      ],
    ],
  },
  g1: {
    far: [
      [
        [0.34, -0.62],
        [0.52, -0.42],
        [0.56, -0.06],
      ],
      [
        [-0.36, -0.62],
        [-0.5, -0.4],
        [-0.56, -0.06],
      ],
    ],
    near: [
      [
        [0.38, -0.62],
        [0.5, -0.4],
        [0.34, -0.18],
      ],
      [
        [-0.4, -0.62],
        [-0.32, -0.38],
        [-0.2, -0.12],
      ],
    ],
  },
  idle: {
    far: [
      [
        [0.34, -0.62],
        [0.34, -0.34],
        [0.3, -0.03],
      ],
      [
        [-0.36, -0.62],
        [-0.4, -0.34],
        [-0.34, -0.03],
      ],
    ],
    near: [
      [
        [0.38, -0.62],
        [0.42, -0.34],
        [0.42, -0.03],
      ],
      [
        [-0.4, -0.62],
        [-0.52, -0.36],
        [-0.44, -0.03],
      ],
    ],
  },
} as unknown as Record<'g0' | 'g1' | 'idle', { far: Pt[][]; near: Pt[][] }>;

/** Patte en deux segments, contour puis aplat ; sabot sombre. */
function leg(ctx: CanvasRenderingContext2D, p: Pt[], color: string, w: number) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [col, ww] of [
    [INK, w + 0.05],
    [color, w],
  ] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = ww;
    ctx.beginPath();
    ctx.moveTo(p[0]![0], p[0]![1]);
    ctx.lineTo(p[1]![0], p[1]![1]);
    ctx.lineTo(p[2]![0], p[2]![1]);
    ctx.stroke();
  }
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(p[2]![0], p[2]![1], w * 0.62, 0, Math.PI * 2);
  ctx.fill();
}

export interface HorseOpts {
  coat: Coat;
  /** Image de galop (0 allongé, 1 ramassé). */
  frame: 0 | 1;
  idle: boolean;
  /** Couleur de la couverture de selle (couleur du camp), ou null. */
  blanket: string | null;
  t: number;
}

/** Hauteur du dos du cheval (en `u`), là où s'assoit le cavalier. */
export const HORSE_BACK = 0.9;

/** Un cheval de profil, long d'environ 1,5 u, dont le dos est à HORSE_BACK u du sol. */
export function drawHorse(ctx: CanvasRenderingContext2D, u: number, o: HorseOpts) {
  const set = LEGS[o.idle ? 'idle' : o.frame ? 'g1' : 'g0'];
  ctx.save();
  ctx.scale(u, u);
  ctx.translate(0, o.idle ? 0 : o.frame ? 0 : -0.04);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.04;
  for (const p of set.far) leg(ctx, p, o.coat.far, 0.1);
  // Silhouette : croupe, dos, encolure, tête, poitrail, ventre.
  const body = new Path2D(
    'M-0.52 -0.84Q-0.5 -0.95 -0.3 -0.93L0.28 -0.92Q0.42 -0.96 0.5 -1.18L0.58 -1.3Q0.66 -1.34 0.72 -1.26L0.96 -0.98Q0.98 -0.92 0.92 -0.9L0.78 -0.96L0.64 -0.98Q0.6 -0.84 0.52 -0.7Q0.45 -0.58 0.2 -0.56L-0.3 -0.58Q-0.5 -0.6 -0.56 -0.72Q-0.58 -0.78 -0.52 -0.84Z',
  );
  // Queue (agitée par le galop).
  const sway = Math.sin(o.t * 6 + (o.frame ? 1 : 0)) * (o.idle ? 0.03 : 0.07);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.13;
  ctx.beginPath();
  ctx.moveTo(-0.52, -0.84);
  ctx.quadraticCurveTo(-0.8 + sway, -0.82, -0.86 + sway, -0.5);
  ctx.stroke();
  ctx.strokeStyle = o.coat.mane;
  ctx.lineWidth = 0.08;
  ctx.stroke();
  ctx.fillStyle = o.coat.body;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.045;
  // oxlint-disable-next-line unicorn/no-array-fill-with-reference-type -- ctx.fill d'un Path2D, pas Array.fill
  ctx.fill(body);
  ctx.stroke(body);
  // Oreille, crinière, œil, naseau.
  ctx.fillStyle = o.coat.body;
  ctx.beginPath();
  ctx.moveTo(0.59, -1.3);
  ctx.lineTo(0.63, -1.43);
  ctx.lineTo(0.68, -1.28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = o.coat.mane;
  ctx.lineWidth = 0.08;
  ctx.beginPath();
  ctx.moveTo(0.27, -0.96);
  ctx.quadraticCurveTo(0.4, -1.03, 0.47, -1.2);
  ctx.lineTo(0.57, -1.31);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(0.74, -1.16, 0.025, 0, Math.PI * 2);
  ctx.fill();
  // Couverture de selle aux couleurs du camp.
  if (o.blanket) {
    ctx.fillStyle = o.blanket;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.roundRect(-0.24, -0.97, 0.42, 0.26, 0.05);
    ctx.fill();
    ctx.stroke();
  }
  for (const p of set.near) leg(ctx, p, o.coat.body, 0.1);
  ctx.restore();
}

/** Cheval abattu, couché sur le flanc, pattes en l'air. */
export function drawFallenHorse(ctx: CanvasRenderingContext2D, u: number, coat: Coat) {
  ctx.save();
  ctx.scale(u, u);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const [x0, x1, y1] of [
    [-0.3, -0.62, -0.56],
    [-0.12, -0.34, -0.6],
    [0.22, 0.5, -0.58],
    [0.38, 0.74, -0.46],
  ] as const) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.14;
    ctx.beginPath();
    ctx.moveTo(x0, -0.28);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = coat.far;
    ctx.lineWidth = 0.09;
    ctx.stroke();
  }
  ctx.fillStyle = coat.body;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.045;
  ctx.beginPath();
  ctx.ellipse(0, -0.24, 0.55, 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0.7, -0.1, 0.24, 0.1, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = coat.mane;
  ctx.lineWidth = 0.08;
  ctx.beginPath();
  ctx.moveTo(-0.55, -0.2);
  ctx.quadraticCurveTo(-0.8, -0.12, -0.9, -0.04);
  ctx.stroke();
  ctx.restore();
}

/** Dessine le haut du corps d'un soldat (sprite rasterisé de poses.ts rogné à `cropU` unités du dessin d'origine). */
export function drawBust(ctx: CanvasRenderingContext2D, img: HTMLImageElement, k: number, cropU: number, x: number, yBase: number) {
  const per = img.height / 40; // pixels de l'image par unité du dessin
  ctx.drawImage(img, 0, 0, img.width, cropU * per, x - (16 + PAD) * k, yBase - cropU * k, SPRITE_W * k, cropU * k);
}

/* ---------- Éléphant ---------- */

const SKIN = '#8f8a84';
const SKIN_FAR = '#726e69';
const IVORY = '#f1e9d4';

export interface ElephantOpts {
  frame: 0 | 1;
  idle: boolean;
  /** Couleur du camp (caparaçon). */
  blanket: string;
  t: number;
  /** Tour de combat (howdah) sur le dos : le cornac y est remplacé par la place d'un archer, dessinée par l'appelant. */
  howdah: boolean;
  seed: number;
}

/** Hauteur du cou (cornac) et du dos de l'éléphant, en `u`. */
export const ELEPHANT_NECK = { x: 0.5, y: 1.3 };
export const ELEPHANT_BACK = { x: -0.1, y: 1.22 };

/** Éléphant de guerre de profil : corps, quatre pattes, tête, trompe, oreille, défense, caparaçon. */
export function drawElephant(ctx: CanvasRenderingContext2D, u: number, o: ElephantOpts) {
  ctx.save();
  ctx.scale(u, u);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.04;
  const lift = (pair: 0 | 1) => (!o.idle && o.frame === pair ? 0.12 : 0);
  const pillar = (x: number, w: number, color: string, up: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, -0.8, w, 0.8 - up, 0.05);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#d8cdb8';
    ctx.fillRect(x - w / 2 + 0.01, -up - 0.05, w - 0.02, 0.035);
  };
  // Pattes d'abord : le corps en recouvre le haut. Paire lointaine (sombre), puis paire proche.
  pillar(0.3, 0.19, SKIN_FAR, lift(1));
  pillar(-0.46, 0.2, SKIN_FAR, lift(0));
  pillar(0.5, 0.19, SKIN, lift(0));
  pillar(-0.26, 0.2, SKIN, lift(1));
  ctx.save();
  ctx.translate(0, -0.14);
  // Queue.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(-0.66, -0.9);
  ctx.quadraticCurveTo(-0.78, -0.7, -0.74, -0.45);
  ctx.stroke();
  ctx.lineWidth = 0.04;
  // Corps et tête.
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.ellipse(-0.04, -0.88, 0.68, 0.46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0.66, -0.9, 0.27, 0.31, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Trompe qui se balance, défense, œil.
  const sw = Math.sin(o.t * 2.4 + o.seed * 6) * 0.07;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.19;
  ctx.beginPath();
  ctx.moveTo(0.84, -0.8);
  ctx.bezierCurveTo(1.0 + sw, -0.6, 0.98 + sw, -0.3, 0.9 + sw * 2, 0.12);
  ctx.stroke();
  ctx.strokeStyle = SKIN;
  ctx.lineWidth = 0.14;
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.1;
  ctx.beginPath();
  ctx.moveTo(0.8, -0.68);
  ctx.quadraticCurveTo(1.12, -0.62, 1.12, -0.88);
  ctx.stroke();
  ctx.strokeStyle = IVORY;
  ctx.lineWidth = 0.055;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(0.76, -1.0, 0.025, 0, Math.PI * 2);
  ctx.fill();
  // Oreille qui bat.
  ctx.fillStyle = '#7c7873';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.ellipse(0.5, -0.88, 0.12, 0.27, 0.15 + Math.sin(o.t * 3 + o.seed * 5) * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Caparaçon aux couleurs du camp, avec frange.
  ctx.fillStyle = o.blanket;
  ctx.beginPath();
  ctx.moveTo(-0.5, -1.28);
  ctx.quadraticCurveTo(-0.08, -1.42, 0.38, -1.12);
  ctx.lineTo(0.34, -0.74);
  ctx.lineTo(-0.58, -0.74);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e0b43a';
  ctx.fillRect(-0.58, -0.78, 0.92, 0.05);
  ctx.restore();
  ctx.translate(0, -0.14);
  if (o.howdah) {
    // Tour de bois sur le dos, créneaux aux couleurs du camp.
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath();
    ctx.rect(-0.46, -1.62, 0.7, 0.3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = o.blanket;
    for (let i = 0; i < 4; i++) ctx.fillRect(-0.44 + i * 0.18, -1.7, 0.1, 0.1);
    ctx.strokeStyle = INK;
    for (let i = 0; i < 4; i++) ctx.strokeRect(-0.44 + i * 0.18, -1.7, 0.1, 0.1);
  }
  ctx.restore();
}

/** Éléphant abattu : massif couché, pattes raides, trompe au sol. */
export function drawFallenElephant(ctx: CanvasRenderingContext2D, u: number) {
  ctx.save();
  ctx.scale(u, u);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.04;
  ctx.fillStyle = SKIN_FAR;
  for (const [x, a] of [
    [-0.4, -0.35],
    [-0.15, -0.1],
    [0.2, 0.12],
    [0.45, 0.3],
  ] as const) {
    ctx.beginPath();
    ctx.roundRect(x - 0.09, -1.0, 0.18, 0.6, 0.05);
    ctx.save();
    ctx.translate(x, -0.5);
    ctx.rotate(a);
    ctx.translate(-x, 0.5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.ellipse(-0.05, -0.42, 0.72, 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0.78, -0.26, 0.26, 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 0.15;
  ctx.beginPath();
  ctx.moveTo(0.98, -0.18);
  ctx.quadraticCurveTo(1.2, -0.06, 1.3, -0.04);
  ctx.stroke();
  ctx.strokeStyle = SKIN;
  ctx.lineWidth = 0.1;
  ctx.stroke();
  ctx.restore();
}

/* ---------- Char ---------- */

/** Roue à rayons ; `blades` : lames de faux sur le moyeu (chars perses). */
function wheel(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, angle: number, blades: boolean) {
  if (blades) {
    ctx.fillStyle = '#c9ced1';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.035;
    for (let k = 0; k < 4; k++) {
      const a = angle + (k * Math.PI) / 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(x + c * r * 0.12 - s * 0.05, y + s * r * 0.12 + c * 0.05);
      ctx.lineTo(x + c * r * 1.55, y + s * r * 1.55);
      ctx.lineTo(x + c * r * 0.12 + s * 0.05, y + s * r * 0.12 - c * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#8a5a2b';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.045;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 0.03;
  for (let k = 0; k < 4; k++) {
    const a = angle + (k * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92);
    ctx.lineTo(x - Math.cos(a) * r * 0.92, y - Math.sin(a) * r * 0.92);
    ctx.stroke();
  }
  ctx.fillStyle = '#5e3d1c';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

export interface ChariotOpts {
  coat: Coat;
  frame: 0 | 1;
  idle: boolean;
  blanket: string;
  t: number;
  /** Faux sur les moyeux. */
  scythes: boolean;
  /** Angle de la roue (radians). */
  roll: number;
  id: string;
}

/**
 * Char à deux roues attelé de deux chevaux, de profil. Le conducteur est dessiné par l'appelant, debout sur la plate-forme
 * en (CHARIOT_DRIVER.x, CHARIOT_DRIVER.y), en `u`.
 */
export const CHARIOT_DRIVER = { x: -0.42, y: 0.5 };
export function drawChariot(ctx: CanvasRenderingContext2D, u: number, o: ChariotOpts) {
  // Attelage : le second cheval, un peu en arrière-plan, avec une autre robe.
  ctx.save();
  ctx.translate(u * 0.78, -u * 0.04);
  drawHorse(ctx, u * 0.86, { coat: coatOf(`${o.id}b`), frame: o.frame ? 0 : 1, idle: o.idle, blanket: null, t: o.t });
  ctx.restore();
  ctx.save();
  ctx.translate(u * 0.9, u * 0.02);
  drawHorse(ctx, u * 0.86, { coat: o.coat, frame: o.frame, idle: o.idle, blanket: o.blanket, t: o.t });
  ctx.restore();
  ctx.save();
  ctx.scale(u, u);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // Timon.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.07;
  ctx.beginPath();
  ctx.moveTo(-0.1, -0.42);
  ctx.lineTo(0.95, -0.72);
  ctx.stroke();
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 0.035;
  ctx.stroke();
  // Caisse : plate-forme et garde-corps cintré à l'avant, aux couleurs du camp.
  ctx.fillStyle = o.blanket;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.045;
  ctx.beginPath();
  ctx.moveTo(-0.78, -0.3);
  ctx.lineTo(-0.78, -0.5);
  ctx.lineTo(-0.1, -0.5);
  ctx.quadraticCurveTo(-0.02, -0.78, -0.16, -0.86);
  ctx.lineTo(-0.2, -0.86);
  ctx.lineTo(-0.2, -0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e0b43a';
  ctx.fillRect(-0.78, -0.5, 0.68, 0.045);
  wheel(ctx, -0.44, -0.3, 0.3, o.roll, o.scythes);
  ctx.restore();
}

/** Char renversé, chevaux à terre. */
export function drawFallenChariot(ctx: CanvasRenderingContext2D, u: number, coat: Coat, blanket: string) {
  ctx.save();
  ctx.translate(u * 0.85, 0);
  drawFallenHorse(ctx, u * 0.85, coat);
  ctx.restore();
  ctx.save();
  ctx.scale(u, u);
  ctx.rotate(-0.5);
  ctx.translate(-0.2, 0.05);
  ctx.fillStyle = blanket;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.045;
  ctx.fillRect(-0.7, -0.5, 0.6, 0.25);
  ctx.strokeRect(-0.7, -0.5, 0.6, 0.25);
  wheel(ctx, -0.4, -0.3, 0.28, 0.4, false);
  ctx.restore();
}

/* ---------- Brûlot ---------- */

/**
 * Petite embarcation en flammes, longue d'environ 1,6 u. `dead` : coque noircie, éteinte, qui fume encore à peine.
 * Les flammes et la fumée sont dérivées du temps `t` (aucun état).
 */
export function drawBrulot(ctx: CanvasRenderingContext2D, u: number, t: number, id: string, dead: boolean) {
  const seed = hash01(id) * 10;
  ctx.save();
  ctx.scale(u, u);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const bob = Math.sin(t * 2.2 + seed) * 0.03;
  ctx.translate(0, bob + (dead ? 0.06 : 0));
  // Coque.
  ctx.fillStyle = dead ? '#2a211a' : '#5a3a20';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.045;
  ctx.beginPath();
  ctx.moveTo(-0.8, -0.34);
  ctx.quadraticCurveTo(-0.7, -0.02, -0.3, 0.02);
  ctx.lineTo(0.4, 0.02);
  ctx.quadraticCurveTo(0.76, -0.04, 0.92, -0.42);
  ctx.lineTo(0.6, -0.26);
  ctx.lineTo(-0.5, -0.26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (!dead) {
    // Mât et voile qui brûlent, puis les langues de feu sur le pont.
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.06;
    ctx.beginPath();
    ctx.moveTo(0, -0.26);
    ctx.lineTo(0, -0.95);
    ctx.stroke();
    const tongues: [number, number, number][] = [
      [-0.55, 0.22, 0.5],
      [-0.3, 0.3, 0.78],
      [-0.05, 0.34, 1.0],
      [0.2, 0.3, 0.74],
      [0.45, 0.22, 0.48],
    ];
    const palette = ['#d9431a', '#ff9d2e', '#ffe27a'];
    tongues.forEach(([x, w, h], k) => {
      const flick = 0.78 + 0.22 * Math.sin(t * 9 + k * 1.9 + seed);
      const sway = Math.sin(t * 6 + k * 2.3 + seed) * 0.07;
      for (let layer = 0; layer < 3; layer++) {
        const s = 1 - layer * 0.28;
        const hh = h * flick * s * 0.9;
        ctx.fillStyle = palette[layer]!;
        ctx.beginPath();
        ctx.moveTo(x - w * s * 0.5, -0.26);
        ctx.quadraticCurveTo(x - w * s * 0.45 + sway, -0.26 - hh * 0.55, x + sway * 1.6, -0.26 - hh);
        ctx.quadraticCurveTo(x + w * s * 0.45 + sway, -0.26 - hh * 0.5, x + w * s * 0.5, -0.26);
        ctx.closePath();
        ctx.fill();
        if (layer === 0) ctx.stroke();
      }
    });
  }
  // Fumée sombre qui monte et dérive sous le vent.
  const puffs = dead ? 2 : 5;
  for (let k = 0; k < puffs; k++) {
    const q = (t * (dead ? 0.25 : 0.45) + k / puffs + seed) % 1;
    const x = 0.1 + q * 0.9 + Math.sin(q * 6 + k) * 0.08;
    const y = -0.5 - q * 1.9;
    ctx.fillStyle = `rgba(38, 32, 28, ${(dead ? 0.3 : 0.55) * (1 - q)})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.16 + q * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
