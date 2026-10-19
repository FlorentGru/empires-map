import type { Faction } from '../types';

/**
 * Soldats par faction : dessins SVG plats en chaînes (viewBox 0 0 32 40).
 * Les chaînes sont consommées telles quelles par le front (marqueurs HTML impératifs) ;
 * le composant React `Soldier` ne sert qu'à la démo.
 */

export const OUT = '#3b2a1a';
export type SoldierFrame = 0 | 1;
export type SoldierState = 'marche' | 'vaincu';

const path = (d: string, fill: string, extra = '') => `<path d="${d}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;
const circ = (cx: number, cy: number, r: number, fill: string, extra = '') =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;
const rect = (x: number, y: number, w: number, h: number, fill: string, rx = 0, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;
const ell = (cx: number, cy: number, rx: number, ry: number, fill: string, extra = '') =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;
/** Trait de détail sans contour sombre. */
const stroke = (d: string, color: string, w = 1, extra = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}"${extra ? ' ' + extra : ''}/>`;

const GOLD = '#e0b43a';
const STEEL = '#a9adb0';
const BRONZE = '#c08a3e';
const WOOD = '#8a5a2b';
const RED = '#a8281e';
const WHITE = '#f4efe0';
const SKIN = '#e0b48a';

type LegKind = 'bare' | 'pants' | 'checks';

interface Spec {
  skin?: string;
  tunic: string;
  legs: LegKind;
  legColor?: string;
  legColor2?: string;
  boots?: string;
  /** Jupe / robe longue par-dessus le haut des jambes. */
  skirt?: string;
  /** Décor du torse (dessiné après le torse). */
  deco?: string;
  /** Cheveux arrière, avant le visage. */
  back?: string;
  /** Coiffe / barbe / moustache, après le visage. */
  head: string;
  shield?: string;
  weapon: string;
}

/* Jambes : [xHautG, xHautD, xBasG, xBasD] à y=26 et y=37. */
const LEGS: Record<SoldierFrame, [number[], number[]]> = {
  0: [
    [12, 16, 12, 16],
    [17, 21, 17, 21],
  ],
  1: [
    [12.5, 16.5, 8.5, 12.5],
    [15.5, 19.5, 19.5, 23.5],
  ],
};
const Y0 = 26;
const Y1 = 37;
const xAt = (l: number[], y: number): [number, number] => {
  const t = (y - Y0) / (Y1 - Y0);
  return [l[0] + (l[2] - l[0]) * t, l[1] + (l[3] - l[1]) * t];
};
const legPoly = (l: number[], ya: number, yb: number) => {
  const [a1, b1] = xAt(l, ya);
  const [a2, b2] = xAt(l, yb);
  return `M${a1} ${ya}L${b1} ${ya}L${b2} ${yb}L${a2} ${yb}Z`;
};

function legsSvg(s: Spec, frame: SoldierFrame): string {
  const skin = s.skin ?? SKIN;
  const color = s.legs === 'bare' ? skin : (s.legColor ?? '#8a6a3a');
  let out = '';
  for (const l of LEGS[frame]) {
    out += path(legPoly(l, Y0, Y1), color);
    if (s.legs === 'checks') {
      const c2 = s.legColor2 ?? '#2f5f9b';
      out += path(legPoly(l, 28.5, 30.5), c2, 'stroke="none"');
      out += path(legPoly(l, 32.5, 34.5), c2, 'stroke="none"');
    } else if (s.legs === 'pants' && s.legColor2) {
      out += path(legPoly(l, 28.5, 29.7), s.legColor2, 'stroke="none"');
    }
    if (s.boots) out += path(legPoly(l, 33.5, Y1), s.boots);
  }
  return out;
}

function build(s: Spec, frame: SoldierFrame, state: SoldierState): string {
  const skin = s.skin ?? SKIN;
  const down = state === 'vaincu';
  let g = '';
  g += legsSvg(s, frame);
  if (s.skirt) g += path('M10.5 25L21.5 25L23 33L9 33Z', s.skirt);
  g += s.back ?? '';
  g += rect(14.5, 11.5, 3, 4, skin);
  // torse
  g += path('M11 14Q16 12.5 21 14L22 27L10 27Z', s.tunic);
  g += s.deco ?? '';
  // visage
  g += circ(16, 9, 4, skin);
  g += circ(14.7, 9.3, 0.6, OUT, 'stroke="none"') + circ(17.3, 9.3, 0.6, OUT, 'stroke="none"');
  g += s.head;
  // bras droit + main
  g += path('M20.5 14.5L25 20L22.8 22.2L19.5 18Z', s.tunic);
  g += circ(24.4, 21.4, 1.8, skin);
  // arme
  g += down ? `<g transform="rotate(160 26 18)">${s.weapon}</g>` : s.weapon;
  // bouclier
  if (s.shield) {
    g += down ? `<g transform="translate(-1 12) rotate(-75 8.5 23)">${s.shield}</g>` : s.shield;
  }
  return g;
}

/* ---------- pièces réutilisables ---------- */

const spear = (len = 35) => rect(25.2, 38 - len, 1.6, len, WOOD) + path(`M26 ${37 - len - 2.5}L28 ${38 - len + 1}L24 ${38 - len + 1}Z`, STEEL);
const bow = (color: string) =>
  `<path d="M25 7Q31.5 22 25 37" fill="none" stroke="${OUT}" stroke-width="3.2" stroke-linecap="round"/>` +
  `<path d="M25 7Q31.5 22 25 37" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round"/>` +
  `<path d="M25 7L25 37" fill="none" stroke="#efe6cc" stroke-width="0.6"/>`;
const quiver = (c: string) =>
  path('M9.5 15L12 14.5L12.5 24L10.2 24.5Z', c) + path('M10.3 15L10.6 12.5M11.3 14.8L11.7 12.2', '#e8dcc0', 'stroke="#e8dcc0" stroke-width="0.8"');
const stubble = (c: string) => path('M12.3 10.2Q16 15.6 19.7 10.2Q16 12.2 12.3 10.2Z', c, 'stroke="none"');
const moustache = (c: string) => path('M13 10.6Q14.5 9.8 16 10.6Q17.5 9.8 19 10.6Q18 12.3 17 11.5L16 11.1L15 11.5Q14 12.3 13 10.6Z', c, 'stroke="none"');

const dome = (c: string) => path('M11.6 9Q11.6 3.6 16 3.6Q20.4 3.6 20.4 9L19.6 9L19.6 7.4L12.4 7.4L12.4 9Z', c);

/* ---------- époque napoléonienne ---------- */

/** Fusil à baïonnette porté à l'épaule : crosse, canon fin, baïonnette. */
const musket = () =>
  rect(24.5, 27, 2.6, 11, WOOD) +
  rect(25.4, 9, 1, 18.5, '#6e7378') +
  path('M25.9 0.8L27 9L24.8 9Z', '#d6dadc') +
  rect(24.9, 16, 2, 1, STEEL, 0, 'stroke="none"');
/** Shako : fût, visière, plaque, pompon. */
const shako = (c: string, plate = GOLD, pom?: string, h = 5.8) =>
  rect(12.2, 7 - h, 7.6, h, c, 0.8) +
  rect(11.5, 6.3, 9, 1.3, '#1f1a14', 0.4) +
  circ(16, 4.6, 1, plate, 'stroke="none"') +
  (pom ? circ(16, 7 - h - 0.6, 1.3, pom) : '');
/** Buffleteries blanches croisées. */
const belts = (c = WHITE) => stroke('M12 15.5L21 26M21 15.5L12 26', c, 1.5) + circ(16.5, 20.7, 1.1, GOLD, 'stroke="none"');
const ndeco = (c: string) => rect(10.2, 24.4, 11.6, 1.6, c, 0, 'stroke="none"');

export const NAPO_SOLDIER_SPECS = {
  francais: {
    tunic: '#2f4f9b',
    legs: 'pants',
    legColor: WHITE,
    boots: '#2b2219',
    deco:
      path('M11.5 14.8L16 14.8L16 25L11.5 25Z', WHITE, 'stroke="none"') +
      path('M21.5 14.8L16 14.8L16 25L21.5 25Z', WHITE, 'stroke="none"') +
      path('M13 15L16 20.5L19 15', '#2f4f9b', 'stroke="none"') +
      belts() +
      ndeco('#c9473a'),
    head: shako('#1f1a14', GOLD, RED),
    weapon: musket(),
  },
  britanniques: {
    tunic: '#b02a22',
    legs: 'pants',
    legColor: WHITE,
    boots: '#2b2219',
    deco: rect(11, 14.2, 10, 2.4, '#efe6cc', 1, 'stroke="none"') + belts() + stroke('M14.5 22H17.5', GOLD, 0.8) + ndeco('#efe6cc'),
    head: shako('#1f1a14', GOLD, undefined, 7.2) + path('M12.2 0.2L19.8 0.2L19.8 1.4L12.2 1.4Z', '#1f1a14'),
    weapon: musket(),
  },
  autrichiens: {
    tunic: '#ece6d2',
    legs: 'pants',
    legColor: '#8fb4d8',
    boots: '#2b2219',
    deco: rect(11, 14.2, 10, 2.4, '#a8281e', 1, 'stroke="none"') + stroke('M16 17V25', '#bdb59a', 0.8) + belts('#cfc8b4') + ndeco('#bdb59a'),
    head:
      path('M11.6 7.6Q11.4 3 16 2.8Q20.6 3 20.4 7.6L19.8 6.6L12.2 6.6Z', '#1f1a14') +
      path('M14 3Q16 -0.8 18 3Z', '#c9a02a') +
      stroke('M16 1.4V3', '#c9a02a', 1) +
      rect(11.5, 6.3, 9, 1.2, '#1f1a14', 0.4),
    weapon: musket(),
  },
  prussiens: {
    tunic: '#1f2f5a',
    legs: 'pants',
    legColor: '#d8d2c0',
    boots: '#2b2219',
    deco:
      rect(11, 14.2, 10, 2.4, '#b02a22', 1, 'stroke="none"') +
      rect(10.4, 21.5, 2, 3.4, '#b02a22', 0, 'stroke="none"') +
      stroke('M16 17V24.5', GOLD, 0.8) +
      belts('#e8e0c8') +
      ndeco('#b02a22'),
    head: shako('#1f1a14', '#c9a02a', undefined, 6.4) + path('M18 1.4Q21 -1 22 2Q20 1.6 18 3Z', '#efe6cc'),
    weapon: musket(),
  },
  russes: {
    tunic: '#2f5f3a',
    legs: 'pants',
    legColor: WHITE,
    boots: '#2b2219',
    deco:
      rect(11, 14.2, 10, 2.4, '#b02a22', 1, 'stroke="none"') +
      stroke('M12 15.5L21 26M21 15.5L12 26', WHITE, 1.4) +
      circ(16.5, 20.7, 1, GOLD, 'stroke="none"') +
      ndeco('#b02a22'),
    head:
      path('M11.9 7Q11.8 3.4 13.4 2.2L18.6 2.2Q20.2 3.4 20.1 7Z', '#1f1a14') +
      rect(11.5, 6.3, 9, 1.3, '#1f1a14', 0.4) +
      circ(16, 4.8, 1.1, GOLD, 'stroke="none"') +
      path('M15 2.2Q16 -1 17 2.2Z', '#efe6cc'),
    weapon: musket(),
  },
  espagnols: {
    skin: '#d2a070',
    tunic: '#7a5230',
    legs: 'pants',
    legColor: '#5e4a34',
    boots: '#3a2a1a',
    deco:
      path('M10.4 14L21.6 14L23 25L9 25Z', '#6b4423') +
      stroke('M12 16L20 16', '#4a2f1a', 0.8) +
      rect(10.2, 23.2, 11.6, 2.2, '#c9473a', 0, 'stroke="none"') +
      stroke('M12 18L20 18', '#4a2f1a', 0.8),
    head: ell(16, 5.6, 8.4, 1.9, '#2b2219') + path('M12 5.8Q12 1 16 1Q20 1 20 5.8Z', '#2b2219') + stroke('M12.2 4.6H19.8', '#c9473a', 1) + moustache('#2d2018'),
    weapon: musket(),
  },
  portugais: {
    tunic: '#7a4f2a',
    legs: 'pants',
    legColor: '#cfc8b4',
    boots: '#2b2219',
    deco: rect(11, 14.2, 10, 2.4, '#2f5f9b', 1, 'stroke="none"') + belts('#e8e0c8') + ndeco('#3b2a1a'),
    head:
      path('M12.2 7L12 4L13 1.8L19 1.8L20 4L19.8 7Z', '#1f1a14') +
      rect(11.5, 6.3, 9, 1.3, '#1f1a14', 0.4) +
      path('M12 4.4L20 4.4', 'none', `stroke="${GOLD}" stroke-width="0.8"`) +
      circ(16, 3.2, 0.9, '#c0392b', 'stroke="none"'),
    weapon: musket(),
  },
  polonais: {
    tunic: '#2a4a8a',
    legs: 'pants',
    legColor: '#cfc8b4',
    boots: '#2b2219',
    deco:
      path('M12.5 14.6L19.5 14.6L20 25L12 25Z', '#a3123a') +
      stroke('M16 15.5V24.5', GOLD, 0.8) +
      circ(14.4, 18, 0.5, GOLD, 'stroke="none"') +
      circ(14.4, 21, 0.5, GOLD, 'stroke="none"') +
      circ(17.6, 18, 0.5, GOLD, 'stroke="none"') +
      circ(17.6, 21, 0.5, GOLD, 'stroke="none"') +
      ndeco('#a3123a'),
    head:
      path('M12.4 7.2L12.8 3.6L19.2 3.6L19.6 7.2Z', '#1f1a14') +
      rect(11.5, 6.4, 9, 1.2, '#1f1a14', 0.4) +
      path('M12.8 3.6L10.4 0.4L21.6 0.4L19.2 3.6Z', '#a3123a') +
      stroke('M16 -1.4V0.6', GOLD, 1.2) +
      circ(16, -1.6, 1, '#efe6cc'),
    weapon:
      rect(25.4, 3, 1.2, 35, WOOD) +
      path('M26 -1.6L27.2 3L24.8 3Z', STEEL) +
      path('M26.6 3.4L32.4 5L26.6 7.4Z', WHITE) +
      path('M26.6 7.4L32.4 9L26.6 11.2Z', '#c0392b'),
  },
} satisfies Partial<Record<Faction, Spec>>;

/* ---------- Asie orientale et steppes ---------- */

/** Hallebarde *ji* : hampe, lame droite et lame latérale. */
const halberd = () =>
  rect(25.4, 4, 1.2, 34, WOOD) +
  path('M26 0L27.2 4.4L24.8 4.4Z', STEEL) +
  path('M26.6 6.4L31.6 5.4L31.4 9.4L26.6 10.6Z', STEEL) +
  circ(26, 5.4, 0.9, RED, 'stroke="none"');
const saber = (blade = '#d6dadc') =>
  path('M24.8 24Q23.6 12 30.4 4.4Q29.8 11 27.2 24Z', blade) + rect(23, 23.6, 5.2, 1.3, GOLD) + rect(25, 24.8, 1.4, 3.4, WOOD);
const roundShield = (c: string, rim: string, boss = GOLD) =>
  circ(8.5, 23, 6.3, c) + circ(8.5, 23, 4.2, 'none', `stroke="${rim}" stroke-width="0.9"`) + circ(8.5, 23, 1.7, boss);
const braid = (c: string) => path('M11.3 8.5L10.2 15L11.8 14.4L12.4 9Z', c) + path('M20.7 8.5L21.8 15L20.2 14.4L19.6 9Z', c);
const fur = (c: string, w = 8.6) => ell(16, 5.8, w, 1.8, c);

export const ASIA_SOLDIER_SPECS = {
  chinois: {
    tunic: '#a8281e',
    legs: 'pants',
    legColor: '#3a3a44',
    boots: '#2b2219',
    deco:
      rect(10.6, 15, 10.8, 10, '#6e5a3a', 1) +
      stroke('M11 17.5H21M11 20H21M11 22.5H21', '#c9a02a', 0.7) +
      stroke('M16 15V25', '#3b2a1a', 0.6) +
      rect(10.2, 24.4, 11.6, 1.6, '#3a2a1a', 0, 'stroke="none"'),
    head:
      path('M11.7 9Q11.7 3.4 16 3.4Q20.3 3.4 20.3 9L19.5 9L19.5 7.2L12.5 7.2L12.5 9Z', '#5c5c62') +
      path('M15.2 3.6Q16 0.4 16.8 3.6Z', RED) +
      stroke('M12 7.6Q9.8 10 10.6 13M20 7.6Q22.2 10 21.4 13', '#5c5c62', 1.4),
    weapon: halberd(),
  },
  xiongnu: {
    skin: '#d2a070',
    tunic: '#6b4a2e',
    legs: 'pants',
    legColor: '#4a3a2a',
    boots: '#2b2219',
    deco:
      path('M10.4 14L21.6 14L22.4 25L9.6 25Z', '#8a6a3a') +
      stroke('M12 17L20 17M12 20.5L20 20.5', '#4a2f1a', 0.8) +
      rect(10.2, 23.8, 11.6, 1.6, '#c9a02a', 0, 'stroke="none"'),
    back: quiver('#4a2f1a'),
    head: path('M11.6 8Q11.4 3 16 2.6Q20.6 3 20.4 8Q16 5.8 11.6 8Z', '#8a6a3a') + fur('#d8c9a0', 8) + braid('#2d2018') + moustache('#2d2018'),
    weapon: bow('#6b3a1e'),
  },
  mongols: {
    skin: '#d2a070',
    tunic: '#2f5f9b',
    legs: 'pants',
    legColor: '#4a3a2a',
    boots: '#2b2219',
    skirt: '#2f5f9b',
    deco:
      path('M10.4 14L16 14L21.6 25L10.4 25Z', '#264d80', 'stroke="none"') +
      stroke('M16 14.5L21.4 25', GOLD, 0.8) +
      rect(10.2, 22.8, 11.6, 1.8, '#c9473a', 0, 'stroke="none"'),
    back: quiver('#6b3a1e'),
    head:
      path('M12.2 7.4Q12.4 1.6 16 1.2Q19.6 1.6 19.8 7.4Z', '#2f5f9b') +
      path('M15 1.8Q16 -1 17 1.8Z', RED) +
      ell(16, 7, 6.6, 1.6, '#2b2219') +
      braid('#2d2018') +
      stubble('#2d2018'),
    weapon: bow('#8a3a1e'),
  },
  jurchens: {
    skin: '#d2a070',
    tunic: '#7a5230',
    legs: 'pants',
    legColor: '#4a3a2a',
    boots: '#2b2219',
    deco: rect(10.6, 15, 10.8, 10, '#a9803a', 1) + stroke('M11 18H21M11 21H21', '#6b4a2e', 0.8) + stroke('M16 15V25', '#6b4a2e', 0.8),
    head:
      path('M11.6 9Q11.6 3.6 16 3.6Q20.4 3.6 20.4 9L19.6 9L19.6 7.2L12.4 7.2L12.4 9Z', '#8e949a') +
      path('M15.2 3.8L16 -1L16.8 3.8Z', STEEL) +
      braid('#2d2018') +
      moustache('#2d2018'),
    weapon: spear(),
  },
  mandchous: {
    tunic: '#c9a02a',
    legs: 'pants',
    legColor: '#2f3a5a',
    boots: '#2b2219',
    deco:
      rect(10.4, 14, 11.2, 12, '#c9a02a') +
      path('M10.4 14L21.6 14L21.6 15.8L10.4 15.8Z', '#2f5f9b', 'stroke="none"') +
      path('M10.4 24.2L21.6 24.2L21.6 26L10.4 26Z', '#2f5f9b', 'stroke="none"') +
      circ(16, 20, 1.6, '#a8281e', 'stroke="none"') +
      stroke('M12 18.5H14M18 18.5H20', '#7a5a10', 0.8),
    back: path('M20.5 9L22.5 18L20.4 16Z', '#2d2018'),
    head:
      path('M11.8 6.6Q16 3.4 20.2 6.6L21 7.6L11 7.6Z', '#1f1a14') +
      path('M12.4 6.6Q16 1.6 19.6 6.6Z', '#1f1a14') +
      circ(16, 2.2, 1.7, '#c0282a') +
      stroke('M16 2.2L13.4 5.6M16 2.2L18.6 5.6', '#c0282a', 0.8),
    weapon: bow('#6b3a1e'),
  },
  japonais: {
    tunic: '#2f3a8a',
    legs: 'pants',
    legColor: '#2b2b33',
    legColor2: '#a8281e',
    boots: '#5a4a3a',
    deco:
      rect(10.6, 14.6, 10.8, 10, '#a8281e', 1) +
      stroke('M11 17.4H21M11 20H21M11 22.6H21', '#e0b43a', 0.8) +
      path('M9.6 14.6L12.6 14.6L12 19.6L9 18.4Z', '#2b2b33') +
      path('M22.4 14.6L19.4 14.6L20 19.6L23 18.4Z', '#2b2b33'),
    head:
      path('M11.4 9Q11.6 3.4 16 3.2Q20.4 3.4 20.6 9L19.8 9L19.8 7.4L12.2 7.4L12.2 9Z', '#2b2b33') +
      path('M11 8.4L9.4 11.6L12.4 10.4Z', '#a8281e') +
      path('M21 8.4L22.6 11.6L19.6 10.4Z', '#a8281e') +
      path('M13.4 3.8Q10.8 0.4 11.6 -0.6Q14.4 1.4 15.6 3.4ZM18.6 3.8Q21.2 0.4 20.4 -0.6Q17.6 1.4 16.4 3.4Z', GOLD) +
      moustache('#2d2018'),
    weapon: spear(37),
  },
  coreens: {
    tunic: '#efe6cc',
    legs: 'pants',
    legColor: '#e8e0c8',
    legColor2: '#2f5f9b',
    boots: '#2b2219',
    deco:
      rect(10.2, 22.6, 11.6, 1.6, '#2f5f9b', 0, 'stroke="none"') +
      path('M10.4 14.4Q16 13 21.6 14.4L21.4 17Q16 15.6 10.6 17Z', '#2f5f9b', 'stroke="none"') +
      rect(11, 17.4, 10, 5, '#a9783f', 1) +
      stroke('M12 19.4H20', '#6b4a2e', 0.7),
    back: quiver('#4a2f1a'),
    head:
      ell(16, 6.2, 7.6, 1.3, '#1f1a14') +
      path('M12.4 6.2Q12.6 1.8 16 1.8Q19.4 1.8 19.6 6.2Z', '#1f1a14') +
      stroke('M12.4 7.4L11.6 12M19.6 7.4L20.4 12', '#2b2219', 0.8),
    weapon: bow('#8a3a1e'),
  },
  tibetains: {
    skin: '#c98f64',
    tunic: '#7a2a20',
    legs: 'pants',
    legColor: '#4a3a2a',
    boots: '#2b2219',
    deco:
      rect(10.6, 14.6, 10.8, 10.4, '#9aa0a6', 1) +
      stroke('M11.4 17H20.6M11.4 19.4H20.6M11.4 21.8H20.6M13 15V24.6M16 15V24.6M19 15V24.6', '#5e646a', 0.6) +
      rect(10.2, 24.2, 11.6, 1.6, '#c9473a', 0, 'stroke="none"'),
    head:
      path('M11.6 8Q11.4 3.4 16 3Q20.6 3.4 20.4 8Q16 5.8 11.6 8Z', '#c9473a') +
      stroke('M11.8 6.2Q16 4.4 20.2 6.2', GOLD, 1) +
      path('M18.4 3.2Q19.6 0.4 21 1.4Q20.2 3 19.6 3.6Z', '#2f5f9b') +
      braid('#2d2018'),
    weapon: spear(),
  },
  vietnamiens: {
    skin: '#d2a070',
    tunic: '#7a4f2a',
    legs: 'bare',
    boots: '#6b3a1e',
    deco:
      path('M10.6 14.4Q16 13 21.4 14.4L21.4 25L10.6 25Z', '#5a3a1e') +
      stroke('M12 17.5H20M12 21H20', '#8a5a2b', 0.8) +
      rect(10.2, 23.6, 11.6, 1.6, '#a8281e', 0, 'stroke="none"'),
    head:
      path('M16 -0.4L26 8L6 8Z', '#d9b24c') +
      stroke('M16 0.4L11.8 7.4M16 0.4L20.2 7.4M16 0.4V7.6', '#a07a1a', 0.7) +
      stroke('M12.6 8L12.2 11.4M19.4 8L19.8 11.4', '#a8281e', 0.8),
    weapon: spear(37),
  },
  'turcs-gokturks': {
    skin: '#d2a070',
    tunic: '#2a6f8f',
    legs: 'pants',
    legColor: '#4a3a2a',
    boots: '#4a2f1a',
    deco:
      path('M10.4 14L21.6 14L22 25L10 25Z', '#245f7a', 'stroke="none"') +
      stroke('M16 14.5V25', GOLD, 0.8) +
      rect(10.2, 23.4, 11.6, 1.8, GOLD, 0, 'stroke="none"'),
    back: path('M11 8Q10.4 3.6 16 3.4Q21.6 3.6 21 8L22 17L20 14.6L12 14.6L10 17Z', '#2d2018'),
    head: stroke('M11.8 6.6Q16 4.4 20.2 6.6', '#a8281e', 1.4) + moustache('#2d2018') + stubble('#2d2018'),
    shield: roundShield('#c6a04a', '#7a2a20', '#9aa0a6'),
    weapon: saber(),
  },
  khitans: {
    skin: '#d2a070',
    tunic: '#8a3a2e',
    legs: 'pants',
    legColor: '#4a3a2a',
    boots: '#2b2219',
    deco:
      path('M10.4 14L21.6 14L22.4 25L9.6 25Z', '#6b2a20', 'stroke="none"') +
      stroke('M11 17L21 24M21 17L11 24', '#c9a02a', 0.8) +
      rect(10.2, 23.6, 11.6, 1.6, '#c9a02a', 0, 'stroke="none"'),
    back: quiver('#4a2f1a'),
    head:
      path('M12.4 5.8Q16 2.4 19.6 5.8Q16 4.4 12.4 5.8Z', '#2d2018', 'stroke="none"') +
      path('M11.4 7.8L10.2 13.4L11.8 12.6L12.4 8.4ZM20.6 7.8L21.8 13.4L20.2 12.6L19.6 8.4Z', '#2d2018') +
      moustache('#2d2018'),
    weapon: bow('#6b3a1e'),
  },
  ouighours: {
    skin: '#d9a982',
    tunic: '#7a2f86',
    legs: 'pants',
    legColor: '#efe6cc',
    legColor2: '#7a2f86',
    boots: '#4a2f1a',
    deco:
      path('M10.4 14L21.6 14L22 25L10 25Z', '#6a2674', 'stroke="none"') +
      stroke('M16 14.5V25', WHITE, 1) +
      rect(10.2, 23.6, 11.6, 1.6, WHITE, 0, 'stroke="none"'),
    head:
      path('M11.8 8Q11.6 3.2 16 2.8Q20.4 3.2 20.2 8L19.6 7L12.4 7Z', '#efe6cc') +
      path('M12.2 5.4Q16 3.6 19.8 5.4L19.8 6.6Q16 5 12.2 6.6Z', '#7a2f86') +
      circ(16, 3.4, 0.8, GOLD, 'stroke="none"') +
      moustache('#2d2018'),
    weapon: saber('#cfd4d6'),
  },
} satisfies Partial<Record<Faction, Spec>>;

/* ---------- les 16 factions antiques ---------- */

/* ---------- XIIIe siècle : adversaires des Mongols ---------- */

const MONGOL_ADV_SOLDIER_SPECS = {
  tangoutes: {
    skin: '#d2a070',
    tunic: '#8a3a22',
    legs: 'pants',
    legColor: '#4a3a2a',
    boots: '#2b2219',
    deco:
      rect(10.6, 15, 10.8, 10, '#a8563a', 1) +
      stroke('M11 17.5H21M11 20H21M11 22.5H21', '#5c2a18', 0.8) +
      stroke('M16 15V25', '#5c2a18', 0.7) +
      rect(10.2, 24.4, 11.6, 1.6, '#3a2a1a', 0, 'stroke="none"'),
    head:
      path('M11.7 9Q11.7 3.4 16 3.4Q20.3 3.4 20.3 9L19.5 9L19.5 7.2L12.5 7.2L12.5 9Z', '#7a4a32') +
      path('M15.4 3.6L16 0.6L16.6 3.6Z', STEEL) +
      path('M11.2 7.6L9.6 12.4L12 12L12.4 8.6Z', '#7a4a32') +
      path('M20.8 7.6L22.4 12.4L20 12L19.6 8.6Z', '#7a4a32') +
      moustache('#2d2018'),
    weapon: spear(),
  },
  khwarezmiens: {
    skin: '#d2a070',
    tunic: '#2f7a6a',
    legs: 'pants',
    legColor: '#e8dcc0',
    boots: '#4a2f1a',
    deco:
      rect(10.4, 15, 11.2, 10, '#9aa0a5', 1) +
      stroke('M11 17H21M11 19.5H21M11 22H21', '#6e747a', 0.7) +
      rect(10.2, 24, 11.6, 1.8, '#c9473a', 0, 'stroke="none"'),
    head:
      path('M12 8.4Q12 2.4 16 0.6Q20 2.4 20 8.4Z', '#8e949a') +
      path('M11.4 8.2Q16 5.4 20.6 8.2L20.2 5.8Q16 3.4 11.8 5.8Z', WHITE) +
      stroke('M12 7Q16 5.2 20 7', GOLD, 0.8) +
      circ(16, 3.8, 0.9, '#c9473a', 'stroke="none"') +
      moustache('#2d2018'),
    shield: circ(8.5, 23, 6.3, '#2f7a6a') + circ(8.5, 23, 4.2, 'none', `stroke="${GOLD}" stroke-width="0.9"`) + circ(8.5, 23, 1.7, GOLD),
    weapon:
      `<g transform="rotate(14 26 20)">` +
      path('M25.2 3Q28.8 8 27 22L25.4 22Z', '#d6dadc') +
      rect(23.6, 22, 4.6, 1.4, GOLD) +
      rect(25.2, 23.4, 1.6, 5, WOOD) +
      `</g>`,
  },
  rus: {
    skin: '#e0b48a',
    tunic: '#7a8a4a',
    legs: 'pants',
    legColor: '#5a4a3a',
    boots: '#4a2f1a',
    deco: rect(10.6, 15, 10.8, 9, '#8e949a', 1) + stroke('M11 17.5H21M11 20H21', '#6e747a', 0.7) + rect(10.2, 24, 11.6, 1.6, '#4a2f1a', 0, 'stroke="none"'),
    back: path('M12 9L11.6 14L20.4 14L20 9Z', '#8e949a'),
    head: path('M11.8 8.6Q12 3.6 16 -0.4Q20 3.6 20.2 8.6L19.4 8.6L19.4 7.2L12.6 7.2L12.6 8.6Z', STEEL) + rect(15.4, 7.6, 1.2, 3.6, STEEL) + stubble('#8a5a2b'),
    shield: path('M8.5 13Q14 15 14 23Q14 30 8.5 35Q3 30 3 23Q3 15 8.5 13Z', RED) + stroke('M8.5 15V33M5.2 22H11.8', GOLD, 0.8) + circ(8.5, 23, 1.5, GOLD),
    weapon: spear(),
  },
  'chevaliers-europeens': {
    tunic: '#2f4f9b',
    legs: 'pants',
    legColor: '#8e949a',
    boots: '#6e747a',
    skirt: '#2f4f9b',
    deco:
      path('M10.6 14.5L21.4 14.5L21.4 22L16 26L10.6 22Z', '#e8c53a', 'stroke="none"') +
      path('M16 15.5L18.4 19L16 23L13.6 19Z', '#2f4f9b', 'stroke="none"') +
      rect(10.2, 24.4, 11.6, 1.6, '#e8c53a', 0, 'stroke="none"'),
    head:
      path('M11.4 14L11.4 3.6L20.6 3.6L20.6 14Z', '#aeb3b8') +
      rect(12.4, 7.6, 7.2, 1.2, '#2b2219', 0, 'stroke="none"') +
      stroke('M16 3.6V13', '#6e747a', 1) +
      path('M13.5 3.6Q16 0.4 18.5 3.6Z', '#e8c53a'),
    shield:
      path('M3.5 14H13.5V24Q13.5 31 8.5 34Q3.5 31 3.5 24Z', '#e8c53a') +
      path('M3.5 14H8.5V34Q3.5 31 3.5 24Z', '#2f4f9b', 'stroke="none"') +
      circ(11, 19, 1.3, '#2f4f9b', 'stroke="none"'),
    weapon:
      rect(25.3, 2, 1.7, 21, '#d6dadc') +
      path('M26.15 -0.6L27.2 2L25.1 2Z', '#d6dadc') +
      rect(22.8, 22.4, 6.8, 1.5, '#8a5a2b') +
      rect(25.3, 23.8, 1.7, 3.6, WOOD) +
      circ(26.15, 28, 1.1, '#e8c53a'),
  },
  mamelouks: {
    skin: '#c89a6a',
    tunic: '#e0b43a',
    legs: 'pants',
    legColor: '#a8281e',
    boots: '#4a2f1a',
    deco:
      path('M10.4 14L16 14L21.6 25L10.4 25Z', '#c9871e', 'stroke="none"') +
      stroke('M16 14.5L21.4 25', '#a8281e', 0.9) +
      rect(10.2, 23.4, 11.6, 1.8, '#a8281e', 0, 'stroke="none"'),
    back: quiver('#a8281e'),
    head:
      path('M11.4 8.4Q11.2 4.6 16 4.2Q20.8 4.6 20.6 8.4Q16 6.2 11.4 8.4Z', '#f4efe0') +
      path('M12.4 5.6Q12.6 2.6 16 2.4Q19.4 2.6 19.6 5.6Z', '#a9adb0') +
      path('M15.3 2.6L16 -1.4L16.7 2.6Z', STEEL) +
      stroke('M11.6 6.6Q16 4.8 20.4 6.6', '#a8281e', 1) +
      moustache('#2d2018'),
    weapon:
      `<g transform="rotate(12 26 20)">` +
      path('M25 4Q29.6 10 27.4 22L25.4 22Z', '#d6dadc') +
      rect(23.6, 22, 5, 1.4, GOLD) +
      rect(25.2, 23.4, 1.6, 5, WOOD) +
      `</g>` +
      stroke('M24 9Q29 18 24 29', '#8a3a1e', 1.2),
  },
} satisfies Partial<Record<Faction, Spec>>;

/* ---------- Espagne : Renaissance, Amériques, XXe siècle ---------- */

/** Arquebuse à mèche (canon long, crosse) tenue en travers. */
const arquebus = () =>
  rect(24.6, 26, 2.6, 11, WOOD) +
  rect(25.5, 8, 1, 18.5, '#5e646a') +
  rect(24.9, 6.8, 2.4, 1.6, '#2b2219', 0, 'stroke="none"') +
  circ(26, 6.4, 0.8, '#e07b1a', 'stroke="none"');
/** Rapière à garde en coquille. */
const rapier = () =>
  rect(25.5, 5, 1.1, 19, '#d6dadc') + path('M26 2.6L26.9 5L25.1 5Z', '#d6dadc') + ell(26, 24.4, 3.2, 1.6, GOLD) + rect(25.4, 25.4, 1.3, 3.6, '#2b2219');
/** Morion : calotte, crête, bords relevés. */
const morion = (c: string, plume?: string) =>
  path('M11.6 8.6Q11.8 4 16 3.6Q20.2 4 20.4 8.6L19.6 7.4L12.4 7.4Z', c) +
  path('M10.2 7.2Q16 9 21.8 7.2Q21.6 6 20 6.4Q16 7.4 12 6.4Q10.4 6 10.2 7.2Z', c) +
  path('M13 3.8Q16 -0.8 19 3.8Q16 2.6 13 3.8Z', c) +
  (plume ? path('M16 2.4Q19.6 -1.2 21.6 1Q19 1.4 17.2 3Z', plume) : '');
const ruff = (c = WHITE) => path('M11.4 13.6Q16 16.4 20.6 13.6L20.2 15.4Q16 17.8 11.8 15.4Z', c);
const goatee = (c: string) => path('M14.6 11.6Q16 15 17.4 11.6Q16 12.6 14.6 11.6Z', c, 'stroke="none"');

export const ESP_SOLDIER_SPECS = {
  tercios: {
    tunic: '#8a2a20',
    legs: 'pants',
    legColor: '#7a5a34',
    boots: '#3a2a1a',
    deco:
      path('M11 14.4Q16 12.8 21 14.4L21.6 23.6Q16 25.6 10.4 23.6Z', '#a9adb0') +
      stroke('M16 14.4V24.4', '#6e747a', 0.8) +
      stroke('M12 17.6H20', '#6e747a', 0.6) +
      stroke('M10.6 14L21.4 14L22.6 26', '#c0282a', 1.4) +
      ruff(),
    head: morion('#8e949a', RED) + goatee('#2d2018') + moustache('#2d2018'),
    weapon: arquebus(),
  },
  azteques: {
    skin: '#b97a50',
    tunic: '#e8dcc0',
    legs: 'bare',
    boots: '#a9783f',
    deco:
      path('M10.6 14.4Q16 13 21.4 14.4L21.4 25L10.6 25Z', '#e8dcc0') +
      stroke('M11.5 17.5H20.5M11.5 20.5H20.5', '#c9473a', 0.9) +
      stroke('M16 14.6V25', '#2f7a52', 0.9) +
      rect(10.2, 24, 11.6, 1.6, '#c9473a', 0, 'stroke="none"'),
    head:
      path('M11.2 8.6Q10.8 2.8 16 2.4Q21.2 2.8 20.8 8.6L19.6 8.6L19.6 7L12.4 7L12.4 8.6Z', '#d9902a') +
      circ(14, 5.6, 0.7, OUT, 'stroke="none"') +
      circ(18, 5.6, 0.7, OUT, 'stroke="none"') +
      path('M12 3.6Q10 -1 13 0.4Q14 2 14 3.4ZM20 3.6Q22 -1 19 0.4Q18 2 18 3.4ZM14.6 2.6Q16 -2.6 17.4 2.6Z', '#2f9a6a'),
    shield:
      circ(8.5, 23, 6.3, '#2f9a6a') +
      circ(8.5, 23, 4.2, 'none', `stroke="${GOLD}" stroke-width="1"`) +
      circ(8.5, 23, 1.8, '#c9473a') +
      stroke('M8.5 16.8V29.2M2.3 23H14.7', '#e8dcc0', 0.7),
    weapon:
      rect(25.4, 14, 1.8, 24, WOOD) +
      path('M24.6 15.4L28 15.4L28.4 6Q26.3 3.4 24.2 6Z', '#6b4a2e') +
      path('M25 6.6L25 14.8M27.6 6.6L27.6 14.8', '#1f1a14', 'stroke="#1f1a14" stroke-width="1.1"'),
  },
  incas: {
    skin: '#b97a50',
    tunic: '#c9473a',
    legs: 'bare',
    boots: '#a9783f',
    deco:
      path('M10.6 14.4Q16 13 21.4 14.4L21.4 25L10.6 25Z', '#c9473a') +
      rect(11.2, 17, 9.6, 5.4, '#efe6cc', 0, 'stroke="none"') +
      path('M13 17L16 19.7L13 22.4ZM19 17L16 19.7L19 22.4Z', '#2f5f9b', 'stroke="none"') +
      rect(10.2, 24, 11.6, 1.6, '#e0b43a', 0, 'stroke="none"'),
    head:
      path('M11.6 8.6Q11.6 3.4 16 3.2Q20.4 3.4 20.4 8.6L19.6 8.6L19.6 6.8L12.4 6.8L12.4 8.6Z', '#a9783f') +
      stroke('M12 5.4H20', '#c9473a', 1.2) +
      path('M15 3.4Q16 0 17 3.4Z', '#c9473a') +
      path('M16 3.2Q18.6 -1 20.4 0.8Q18.4 1.2 17 3.4Z', '#efe6cc'),
    shield: rect(3.4, 14.6, 10.4, 16.6, '#7a2a20', 1.5) + rect(3.4, 14.6, 10.4, 8.3, '#e0b43a', 1.5, 'stroke="none"') + circ(8.6, 22.9, 1.9, '#efe6cc'),
    weapon:
      rect(25.6, 12, 1.4, 26, WOOD) + circ(26.3, 9.6, 3, '#9aa0a6') + stroke('M26.3 6.2V13M22.9 9.6H29.7M24 7.3L28.6 11.9M28.6 7.3L24 11.9', '#6e747a', 0.8),
  },
  'francais-ancien-regime': {
    tunic: '#efe6cc',
    legs: 'pants',
    legColor: '#8a6a3a',
    boots: '#4a2f1a',
    deco:
      path('M10.6 14.4Q16 13 21.4 14.4L21.4 24.4L10.6 24.4Z', '#c9a878') +
      path('M10.4 14L21.6 14L22.8 25.6', 'none', 'stroke="#f4efe0" stroke-width="2.4"') +
      stroke('M12 17H20M12 20H20', '#8a6a3a', 0.7) +
      ruff('#efe6cc'),
    head:
      path('M11.6 7.4Q16 6.6 20.4 7.4L19.4 4.6Q16 3.2 12.6 4.6Z', '#4a3a2a') +
      ell(16, 6.6, 8.6, 1.6, '#4a3a2a') +
      path('M18 3.8Q22 -1 23 3.6Q20.6 2.8 19 5.2Z', WHITE) +
      moustache('#2d2018') +
      goatee('#2d2018'),
    weapon:
      rapier() +
      path('M23.8 6.4L29 6.4L29 11.6L23.8 11.6Z', WHITE, 'stroke="none"') +
      path('M26.4 7.4L26.4 10.6M24.8 9H28', '#2f4fa8', 'stroke="#2f4fa8" stroke-width="0.8"'),
  },
  neerlandais: {
    tunic: '#2b2219',
    legs: 'pants',
    legColor: '#4a3a2a',
    boots: '#2b2219',
    deco:
      path('M10.6 14.4Q16 13 21.4 14.4L21.4 24.6L10.6 24.6Z', '#3a3028') +
      stroke('M16 14.6V24.6', '#8a7a5a', 0.8) +
      circ(16, 17, 0.5, GOLD, 'stroke="none"') +
      circ(16, 20, 0.5, GOLD, 'stroke="none"') +
      stroke('M10.6 14.6L21.6 25.6', '#e07b1a', 1.8) +
      ruff(),
    head:
      ell(16, 6.4, 9.2, 1.7, '#1f1a14') +
      path('M12 6.6Q12 1.8 16 1.6Q20 1.8 20 6.6Z', '#1f1a14') +
      stroke('M12.2 5.2H19.8', '#e07b1a', 1) +
      moustache('#8a5a2b') +
      goatee('#8a5a2b'),
    weapon: arquebus(),
  },
  'anglais-elisabethains': {
    tunic: '#7a5a34',
    legs: 'pants',
    legColor: '#efe6cc',
    legColor2: '#a8281e',
    boots: '#4a2f1a',
    deco:
      path('M10.6 14.4Q16 13 21.4 14.4L21.4 24.4L10.6 24.4Z', '#b02a22') +
      stroke('M16 14.6V24.4', GOLD, 0.8) +
      stroke('M12 17.4H20M12 20.6H20', '#6b2018', 0.7) +
      rect(10.2, 23.6, 11.6, 1.6, '#efe6cc', 0, 'stroke="none"') +
      ruff(),
    head:
      path('M11.8 7Q12 3 16 2.8Q20 3 20.2 7L19.4 7Q16 5.8 12.6 7Z', '#a8281e') +
      stroke('M12 6.2Q16 5 20 6.2', WHITE, 1) +
      path('M19 3.6Q22 0.6 22.6 4Q20.8 3.2 19.6 5Z', WHITE) +
      goatee('#8a5a2b') +
      moustache('#8a5a2b'),
    weapon: rapier(),
    shield: path('M3.8 14H13.2V26H3.8Z', WHITE) + rect(7.6, 14, 1.8, 12, RED, 0, 'stroke="none"') + rect(3.8, 19, 9.4, 1.8, RED, 0, 'stroke="none"'),
  },
  'espagnols-xxe': {
    skin: '#d2a070',
    tunic: '#7a7a4a',
    legs: 'pants',
    legColor: '#6a6a40',
    boots: '#4a2f1a',
    deco:
      path('M10.6 14.4Q16 13 21.4 14.4L21.4 25L10.6 25Z', '#8a8a54') +
      stroke('M16 14.6V25', '#5a5a34', 0.8) +
      circ(14.4, 18, 0.5, GOLD, 'stroke="none"') +
      circ(14.4, 21, 0.5, GOLD, 'stroke="none"') +
      stroke('M10.4 14.2L21.6 24.6', '#4a2f1a', 1.4) +
      rect(10.2, 23.8, 11.6, 1.6, '#4a2f1a', 0, 'stroke="none"'),
    head:
      path('M11.8 6.8Q12 3 16 2.8Q20 3 20.2 6.8Q16 5.4 11.8 6.8Z', '#8a8a54') +
      path('M11.4 6.8Q16 8.6 20.6 6.8L20.6 5.8Q16 7 11.4 5.8Z', '#4a3a2a') +
      circ(16, 4.2, 0.8, '#c9473a', 'stroke="none"') +
      moustache('#2d2018'),
    weapon: musket(),
  },
  rifains: {
    skin: '#c98f64',
    tunic: '#8a6a44',
    legs: 'pants',
    legColor: '#6a5030',
    boots: '#a9783f',
    skirt: '#8a6a44',
    deco:
      stroke('M11 16L21 25M21 16L11 25', '#4a2f1a', 1.4) +
      stroke('M12 17V24M20 17V24', '#a9783f', 0.8) +
      rect(10.2, 23.4, 11.6, 1.4, '#4a2f1a', 0, 'stroke="none"'),
    back: path('M10.6 8Q10.2 3.6 16 3.4Q21.8 3.6 21.4 8L22 14.4L20 12L12 12L10 14.4Z', '#6a5030'),
    head: path('M11.4 7.4Q11.4 2.8 16 2.6Q20.6 2.8 20.6 7.4Q16 5.4 11.4 7.4Z', WHITE) + stroke('M11.6 6.2Q16 4.4 20.4 6.2', '#d8d0b8', 1) + stubble('#2d2018'),
    weapon: musket(),
  },
  americains: {
    tunic: '#2f4f9b',
    legs: 'pants',
    legColor: '#d8cfae',
    boots: '#4a2f1a',
    deco:
      rect(10.6, 14.4, 10.8, 10.4, '#2f4f9b', 1, 'stroke="none"') +
      path('M13 14.6L16 19L19 14.6', '#efe6cc', 'stroke="none"') +
      stroke('M11 15.2L16 24M21 15.2L16 24', '#efe6cc', 1) +
      rect(10.2, 24, 11.6, 1.6, '#4a2f1a', 0, 'stroke="none"'),
    head:
      ell(16, 6.2, 8.6, 1.8, '#c9a878') +
      path('M12 6.2Q12 2.2 16 2Q20 2.2 20 6.2Z', '#c9a878') +
      stroke('M12.2 5Q16 4 19.8 5', '#6b4a2e', 1) +
      moustache('#8a5a2b'),
    weapon: musket(),
  },
  independantistes: {
    skin: '#c98f64',
    tunic: '#2f6f4a',
    legs: 'pants',
    legColor: '#d8cfae',
    boots: '#4a2f1a',
    deco:
      path('M11 14.4Q16 12.8 21 14.4L21.4 24.4L10.6 24.4Z', '#2f6f4a') +
      path('M10.6 14.2L13.6 14.2L13.6 17L10.8 17Z', '#c0282a') +
      path('M18.4 14.2L21.4 14.2L21.2 17L18.4 17Z', '#c0282a') +
      belts() +
      ndeco('#efe6cc'),
    head: shako('#1f1a14', GOLD, undefined, 5.4) + circ(16.4, 4, 1.1, '#e0b43a') + circ(16.4, 4, 0.5, '#c0282a', 'stroke="none"') + moustache('#2d2018'),
    weapon: musket(),
  },
} satisfies Partial<Record<Faction, Spec>>;

/* ---------- Saint-Empire romain germanique ---------- */

const BLACK = '#1f1a14';
const YELLOW = '#e6b422';
/** Aigle noir héraldique simplifié, centré en (cx, cy), échelle k. */
const eagle = (cx: number, cy: number, k = 1) =>
  `<g transform="translate(${cx} ${cy}) scale(${k})">` +
  path('M0 -4L1.2 -2.6L5 -4.4L3.6 0.2L1.4 1.4L2.2 4.4L0 3.4L-2.2 4.4L-1.4 1.4L-3.6 0.2L-5 -4.4L-1.2 -2.6Z', BLACK, 'stroke="none"') +
  `</g>`;
/** Lance de cavalier avec fanion. */
const lanceWithPennon = (c: string) => spear(36) + path('M26.8 3.4L32.4 4.6L26.8 6.6Z', c);
/** Pique longue (4 à 5 mètres). */
const pike = () => rect(25.4, 1, 1.2, 37, WOOD) + path('M26 -4L27.5 1.4L24.5 1.4Z', STEEL);
/** Écu long (kite) tenu au bras gauche. */
const kite = (c: string, d = '') => path('M3.4 15.5L13.6 15.5L13.6 24Q13.6 29.4 8.5 32.4Q3.4 29.4 3.4 24Z', c) + d;

export const SAINT_SOLDIER_SPECS = {
  imperiaux: {
    tunic: '#a9adb0',
    legs: 'pants',
    legColor: '#8e949a',
    boots: '#3a2a1a',
    deco: path('M10.6 14.4Q16 12.8 21.4 14.4L22.2 25L9.8 25Z', YELLOW) + eagle(16, 19.6, 1) + rect(10.2, 24, 11.6, 1.6, BLACK, 0, 'stroke="none"'),
    head: dome('#a9adb0') + path('M11.4 9L11.2 13.5L13 12.5ZM20.6 9L20.8 13.5L19 12.5Z', '#8e949a') + rect(15.6, 5, 0.9, 5.4, '#8e949a', 0, 'stroke="none"'),
    shield: kite(YELLOW, eagle(8.5, 22, 0.9)),
    weapon: lanceWithPennon(YELLOW),
  },
  'communes-lombardes': {
    tunic: '#d9d0b8',
    legs: 'pants',
    legColor: '#7a5a3a',
    boots: '#3a2a1a',
    deco:
      path('M10.6 14.4Q16 12.8 21.4 14.4L22 25L10 25Z', '#bdb59a') +
      stroke('M11 17H21M11 19.6H21M11 22.2H21', '#9a927a', 0.7) +
      rect(10.2, 24, 11.6, 1.6, '#3a2a1a', 0, 'stroke="none"'),
    head: path('M11.8 9Q12 3.2 16 1.6Q20 3.2 20.2 9L19.6 9L19.6 7.2L12.4 7.2L12.4 9Z', STEEL) + rect(15.6, 4.4, 0.9, 5.2, '#8e949a', 0, 'stroke="none"'),
    shield: kite(WHITE, stroke('M8.5 16.4V30.4M4.4 21.2H12.6', '#c0282a', 2.6, 'stroke-linecap="butt"')),
    weapon: spear(36) + rect(26.8, 3.6, 5, 4, WHITE, 0, 'stroke-width="0.9"') + stroke('M29.3 4.2V7M27.6 5.6H31', '#c0282a', 0.9),
  },
  suisses: {
    tunic: '#b5262a',
    legs: 'pants',
    legColor: '#d8d2c0',
    legColor2: '#b5262a',
    boots: '#3a2a1a',
    deco: stroke('M16 14.6V24.6M11.4 19.6H20.6', WHITE, 2.6, 'stroke-linecap="butt"') + rect(10.2, 24, 11.6, 1.6, '#3a2a1a', 0, 'stroke="none"'),
    head: dome('#8e949a') + ell(16, 7.2, 5.6, 1.1, '#8e949a') + path('M16 3.6Q19 0.6 22 1.6Q20.4 2 18.6 4.4Z', WHITE),
    weapon:
      rect(25.4, 3, 1.2, 35, WOOD) +
      path('M26 -2.4L27.3 3.4L24.7 3.4Z', STEEL) +
      path('M26.6 5.4L31.8 3.8L31.8 10L26.6 9Z', STEEL) +
      path('M25.4 6L22.6 7.4L25.4 8.6Z', STEEL),
  },
  hussites: {
    tunic: '#7a3a24',
    legs: 'pants',
    legColor: '#5e4a34',
    boots: '#3a2a1a',
    deco:
      path('M10.6 14.4Q16 12.8 21.4 14.4L22 25L10 25Z', '#6a3220') +
      ell(16, 19, 4.2, 4.6, '#e8dcc0', 'stroke="none"') +
      path('M13.3 16.2H18.7Q18.7 19.6 16 20.2Q13.3 19.6 13.3 16.2Z', '#c0282a', 'stroke="none"') +
      rect(15.6, 20, 0.8, 2, '#c0282a', 0, 'stroke="none"') +
      rect(14.3, 21.8, 3.4, 0.9, '#c0282a', 0, 'stroke="none"') +
      rect(10.2, 24, 11.6, 1.6, '#3a2a1a', 0, 'stroke="none"'),
    head: dome('#6e747a') + ell(16, 7.2, 5.4, 1, '#6e747a') + stubble('#4a3220'),
    weapon:
      rect(25.4, 10, 1.4, 28, WOOD) +
      stroke('M26 10Q30.4 8 29.4 4', '#6e747a', 1) +
      circ(29.4, 3.4, 2, '#4a4e54') +
      path('M29.4 0.6V1.6M31.8 3.4H30.8M29.4 6.2V5.2M27 3.4H28', '#4a4e54', 'stroke="#4a4e54" stroke-width="1"'),
  },
  lansquenets: {
    tunic: '#b02a22',
    legs: 'pants',
    legColor: '#d9b02a',
    legColor2: '#2f5f9b',
    boots: '#7a5a34',
    deco:
      path('M16 13.6Q19 13 21 14L22 27L16 27Z', '#d9b02a', 'stroke="none"') +
      stroke('M12 17.4L14.4 19M12 21L14.4 22.6M18 17L20.4 18.6M18 20.8L20.4 22.4', '#2b2219', 0.9) +
      stroke('M10.6 14L21.4 14L22.6 26', '#2f5f9b', 1.4) +
      rect(10.2, 24, 11.6, 1.6, '#3a2a1a', 0, 'stroke="none"'),
    head:
      path('M10.2 7.4Q10.4 2.4 16 2.8Q21.6 2.4 21.8 7.4Q16 5.4 10.2 7.4Z', '#2f5f9b') +
      path('M19.4 3.2Q25 -1.4 28.6 3Q24.4 1.8 21 5Z', WHITE) +
      path('M18 2.8Q22 -2.8 27 -1.2Q22.6 -0.8 20 4Z', '#c0282a') +
      moustache('#4a3220'),
    weapon: pike(),
  },
  magyars: {
    tunic: '#a8281e',
    legs: 'pants',
    legColor: '#2f6f3a',
    boots: '#7a2a1e',
    deco:
      stroke('M12.4 16.4H19.6M12.4 19.2H19.6M12.4 22H19.6', GOLD, 1) +
      stroke('M16 14.6V25', '#7a1a14', 0.8) +
      rect(10.2, 24, 11.6, 1.6, '#2f6f3a', 0, 'stroke="none"'),
    head:
      path('M11.8 8.4Q10.8 2.6 16 2.2Q21.2 2.6 20.2 8.4L19.4 6.8L12.6 6.8Z', '#5a3a22') +
      path('M13.2 3.2Q16 0 18.8 3.2Z', '#a8281e') +
      stroke('M16 2.4Q15.4 -1.6 17.8 -3', WHITE, 1.2) +
      moustache('#2d2018'),
    shield: roundShield('#7a4a2a', '#d6a81c'),
    weapon: saber(),
  },
  suedois: {
    tunic: '#c9a05a',
    legs: 'pants',
    legColor: '#2f5f9f',
    boots: '#3a2a1a',
    deco:
      path('M10.6 14.4Q16 12.8 21.4 14.4L22 25L10 25Z', '#b88a44') +
      stroke('M10.6 14.4L21.8 25', '#1f5fb0', 2.6) +
      stroke('M10.6 14.4L21.8 25', '#f2c200', 1) +
      rect(10.2, 24, 11.6, 1.6, '#3a2a1a', 0, 'stroke="none"'),
    head:
      ell(16, 6.6, 8.4, 1.8, '#4a5a7a') +
      path('M11.8 6.6Q12 1.8 16 1.6Q20 1.8 20.2 6.6Z', '#4a5a7a') +
      path('M19 2.4Q24.4 -1 26.6 3Q22.6 1.6 20 4.4Z', '#f2c200') +
      stubble('#4a3220'),
    weapon: musket(),
  },
} satisfies Partial<Record<Faction, Spec>>;

export const SOLDIER_SPECS = {
  romains: {
    tunic: '#b23a2b',
    legs: 'bare',
    boots: '#6b3a1e',
    deco: rect(11.2, 17, 9.8, 6, '#9a9c9a', 1) + stroke('M11.5 19H21M11.5 21H21', '#6e706e', 0.7),
    head: dome(STEEL) + path('M12.5 4.6Q16 -1.4 19.5 4.6L18.2 4.6Q16 1.4 13.8 4.6Z', RED),
    shield: rect(3.5, 14, 10, 19, RED, 2) + stroke('M8.5 15V32M4.5 23.5H12.5', GOLD, 1) + circ(8.5, 23.5, 2.1, GOLD),
    weapon: rect(25.4, 8, 1.2, 30, WOOD) + rect(25.5, 2.5, 1, 6, '#9aa0a6') + path('M26 0.6L27.4 3L24.6 3Z', STEEL),
  },
  latins: {
    tunic: '#c58a3d',
    legs: 'bare',
    boots: '#6b3a1e',
    deco: rect(11.2, 17, 9.8, 5, '#8c6a3a', 1),
    head: dome(BRONZE) + circ(16, 3.6, 0.9, BRONZE),
    shield: circ(8.5, 23, 6.3, '#d2b46a') + circ(8.5, 23, 3.8, 'none', 'stroke="#7a4a24" stroke-width="0.9"') + circ(8.5, 23, 1.8, '#7a4a24'),
    weapon: spear(),
  },
  samnites: {
    tunic: '#a0522d',
    legs: 'bare',
    boots: BRONZE,
    deco: circ(15.5, 18, 2, BRONZE) + circ(19, 18, 2, BRONZE) + circ(17.2, 22.4, 2, BRONZE),
    head:
      dome(BRONZE) +
      path('M13.5 5Q10 1.5 12 0.4Q15.5 1.5 15 5Z', WHITE) +
      path('M15 4.5Q14 0.6 16 0.4Q18 0.6 17 4.5Z', RED) +
      path('M18.5 5Q22 1.5 20 0.4Q16.5 1.5 17 5Z', WHITE),
    shield: ell(8.5, 23, 5, 9.5, '#b8864a') + ell(8.5, 23, 2.8, 7, 'none', 'stroke="#7a2a20" stroke-width="0.9"') + ell(8.5, 23, 1.2, 1.8, '#7a2a20'),
    weapon: spear(),
  },
  carthaginois: {
    skin: '#c98f64',
    tunic: '#6d2f86',
    legs: 'bare',
    boots: '#4a2f1a',
    deco: rect(10.2, 24.5, 11.6, 1.6, GOLD, 0, 'stroke="none"'),
    head: path('M11.8 8.5Q12 3 16 2.4Q20 3 20.2 8.5Z', BRONZE) + stubble('#2d2018'),
    shield: circ(8.5, 23, 6.3, '#e8dcc0') + circ(8.5, 23, 4, 'none', 'stroke="#6d2f86" stroke-width="1.2"') + circ(8.5, 23, 1.6, GOLD),
    weapon: spear(37),
  },
  gaulois: {
    tunic: '#3c6aa0',
    legs: 'checks',
    legColor: '#c9473a',
    legColor2: '#2f5f9b',
    boots: '#6b3a1e',
    deco: stroke('M13.5 15.2Q16 18 18.5 15.2', GOLD, 1.5),
    head: path('M11.6 9L11 5L13 6L13.5 2.5L15.5 5L17 2L18.5 5L20.5 3.5L20.4 9Q16 5.5 11.6 9Z', '#d9b24c') + moustache('#c9952b'),
    shield: ell(8.5, 23, 4.6, 10.5, '#3f7a52') + rect(7.7, 13, 1.6, 20, '#2f5f9b', 0, 'stroke="none"') + ell(8.5, 23, 1.8, 2.2, '#cfd4d6'),
    weapon: rect(25.2, 3, 1.8, 20, '#d0d4d6') + path('M26.1 1.2L27 3L25.2 3Z', '#d0d4d6') + rect(23.4, 22.6, 5.4, 1.4, GOLD) + rect(25.4, 24, 1.4, 3.6, WOOD),
  },
  'grecs-macedoniens': {
    tunic: '#c9473a',
    legs: 'bare',
    boots: BRONZE,
    deco: rect(11.2, 16, 9.8, 7, '#d8c9a0', 1) + stroke('M11.5 19H21', '#a89860', 0.7),
    head: path('M11.6 9Q11.4 3.6 16 3.4Q19 3.4 21.5 5.2Q19 5.5 20.4 9L19.6 9L19.6 7.2L12.4 7.2L12.4 9Z', BRONZE) + path('M12 4Q16 0.4 19 3.6Q16 3 12 4Z', RED),
    shield: circ(8.5, 23, 6.5, '#2f4f9b') + stroke('M8.5 17.8V28.2M3.3 23H13.7M4.8 19.3L12.2 26.7M12.2 19.3L4.8 26.7', GOLD, 0.9) + circ(8.5, 23, 1.7, GOLD),
    weapon: rect(26.2, 1.6, 1.2, 38.4, WOOD) + path('M26.8 -0.2L28.2 3L25.4 3Z', STEEL) + rect(25.8, 37, 2, 2.5, STEEL),
  },
  germains: {
    skin: '#d9a982',
    tunic: '#7a5230',
    legs: 'pants',
    legColor: '#7a6a4a',
    boots: '#4a2f1a',
    deco: path('M10.4 14L21.6 14L22 22L20 20.4L18.4 24L16.6 20.6L14.4 24.4L12.4 20.6L10 22Z', '#9a8a78'),
    back: path('M11 8Q10.6 3.4 16 3.2Q21.4 3.4 21 8L21.6 14.5L19.6 12L12.4 12L10.4 14.5Z', '#a9803a'),
    head: path('M11.8 7Q16 2.5 20.2 7Q16 5 11.8 7Z', '#a9803a') + path('M12 10Q16 17 20 10Q16 12.5 12 10Z', '#9a6a35'),
    shield: circ(8.5, 23, 6.3, '#a9783f') + stroke('M8.5 16.8V29.2', '#7a5230', 0.8) + circ(8.5, 23, 1.9, '#9aa0a6'),
    weapon: rect(25.4, 8, 1.2, 30, WOOD) + path('M26 3L27.4 8.4L24.6 8.4Z', STEEL),
  },
  'parthes-perses': {
    skin: '#d2a070',
    tunic: '#c9923a',
    legs: 'pants',
    legColor: '#2f6f7a',
    legColor2: GOLD,
    boots: '#4a2f1a',
    deco: rect(10.2, 24, 11.6, 1.8, '#7a2a20', 0, 'stroke="none"'),
    back: quiver('#6b3a1e'),
    head: path('M11.7 8Q12 4 15.5 0.6L16.8 0.6Q20 4 20.3 8Q16 6.4 11.7 8Z', '#b8432f') + stroke('M12.2 6.6Q16 5 19.8 6.6', GOLD, 1) + stubble('#2d2018'),
    weapon: bow('#6b3a1e'),
  },
  egyptiens: {
    skin: '#c98f64',
    tunic: '#f1ead8',
    legs: 'bare',
    boots: '#a9783f',
    deco: stroke('M11.5 15.6Q16 20.5 20.5 15.6', GOLD, 2.2) + stroke('M12.5 15.6Q16 19 19.5 15.6', '#2f6fa8', 0.9),
    back:
      path('M10.8 8L10 17L13.4 15.5L13.4 10Z', GOLD) +
      path('M21.2 8L22 17L18.6 15.5L18.6 10Z', GOLD) +
      stroke('M10.4 12.2L13.4 12.6M10.2 14.6L13.4 14.4M21.6 12.2L18.6 12.6M21.8 14.6L18.6 14.4', '#2f6fa8', 0.9),
    head:
      path('M11.3 9Q11 3 16 3Q21 3 20.7 9L19 8Q16 6.6 13 8Z', GOLD) +
      stroke('M12.4 5.2Q16 3.7 19.6 5.2M12 7Q16 5.4 20 7', '#2f6fa8', 0.9) +
      circ(16, 3.2, 0.9, '#2f6fa8', 'stroke="none"'),
    shield:
      ell(8.5, 23, 5.2, 9, '#2f5f9b') + circ(8.5, 19.8, 1.6, 'none', `stroke="${GOLD}" stroke-width="1"`) + stroke('M8.5 21.4V29.2M5.6 23.4H11.4', GOLD, 1.1),
    weapon: spear(),
  },
  daces: {
    tunic: '#e8dcc0',
    legs: 'pants',
    legColor: '#c9a878',
    boots: '#6b3a1e',
    deco: rect(10.2, 24.2, 11.6, 1.6, '#a8442f', 0, 'stroke="none"'),
    head: path('M11.6 8Q11.6 4 15.5 3.5Q19 3.5 21 1Q22.5 4.5 20.5 8L19.8 7.4Q16 6 12.2 7.4Z', '#a8442f') + path('M12 10Q16 16 20 10Q16 12.5 12 10Z', '#6b4a2e'),
    weapon: rect(25.4, 15, 1.4, 23, WOOD) + path('M26 17L26 7Q26 1.6 31.4 2Q28 3.4 27.8 8L27.8 17Z', '#d0d4d6'),
  },
  'goths-vandales': {
    tunic: '#8e949a',
    legs: 'pants',
    legColor: '#8a6a3a',
    boots: '#4a2f1a',
    deco: stroke('M12 17H20M12.5 19.5H20.5M12 22H20M13 24.2H20.5', '#5e646a', 0.8) + rect(10.2, 24.6, 11.6, 1.5, '#4a2f1a', 0, 'stroke="none"'),
    head:
      path('M11.6 9Q11.6 2.5 16 1.5Q20.4 2.5 20.4 9L19.6 9L19.6 7.2L12.4 7.2L12.4 9Z', '#9aa0a6') +
      stroke('M16 1.8V7.2M13.1 3.6L13.6 7.2M18.9 3.6L18.4 7.2', GOLD, 0.9) +
      stroke('M16 7V10.4', '#9aa0a6', 1),
    shield: circ(8.5, 23, 6.3, '#c6a04a') + circ(8.5, 23, 4, 'none', 'stroke="#7a2a20" stroke-width="1"') + circ(8.5, 23, 1.9, '#9aa0a6'),
    weapon: rect(25.4, 10, 1.4, 28, WOOD) + path('M26.8 9.5Q32.4 10 32 16.8Q29.2 15.4 26.8 17.4Z', '#9aa0a6'),
  },
  arabes: {
    skin: '#c98f64',
    tunic: '#efe6cc',
    legs: 'bare',
    boots: '#6b3a1e',
    skirt: '#efe6cc',
    deco: rect(10.2, 23.6, 11.6, 1.8, '#a8281e', 0, 'stroke="none"'),
    back: path('M10.6 7L9.6 14L13 12L13 9Z', WHITE) + path('M21.4 7L22.4 14L19 12L19 9Z', WHITE),
    head: path('M11 8.5Q11 3 16 3Q21 3 21 8.5Q16 6 11 8.5Z', WHITE) + stroke('M11.2 6.8Q16 4.6 20.8 6.8', '#2b2219', 1.2) + stubble('#2d2018'),
    shield: circ(8.5, 22, 5.2, '#8a5a2b') + circ(8.5, 22, 3.4, 'none', `stroke="${GOLD}" stroke-width="0.9"`) + circ(8.5, 22, 1.5, GOLD),
    weapon:
      path('M24.6 23Q23.6 10 30.6 3.6Q29.6 8.4 27.2 11.4Q26.8 17 26.4 23Z', '#d6dadc') + rect(22.9, 22.4, 5.2, 1.3, GOLD) + rect(25, 23.7, 1.4, 3.4, WOOD),
  },
  'turcs-seldjoukides': {
    skin: '#d2a070',
    tunic: '#2a6f8f',
    legs: 'pants',
    legColor: '#7a2a20',
    boots: '#4a2f1a',
    deco: rect(10.2, 23.6, 11.6, 1.8, GOLD, 0, 'stroke="none"') + stroke('M16 14.5V23.5', '#d8c9a0', 0.8),
    back: quiver('#4a2f1a'),
    head:
      path('M11.3 7.6Q11 2 16 2Q21 2 20.7 7.6Q16 6 11.3 7.6Z', '#6b4a2e') +
      path('M11 8.2Q16 6 21 8.2L20.7 6.6Q16 4.6 11.3 6.6Z', '#c9a878') +
      moustache('#2d2018'),
    weapon: bow('#2a6f8f'),
  },
  'croises-latins': {
    tunic: WHITE,
    legs: 'pants',
    legColor: '#8e949a',
    boots: '#6e747a',
    skirt: WHITE,
    deco: rect(15.2, 14.5, 1.8, 16, RED, 0, 'stroke="none"') + rect(12.6, 17.4, 6.8, 1.8, RED, 0, 'stroke="none"'),
    head:
      path('M11.4 14L11.4 4.2Q16 2 20.6 4.2L20.6 14Z', '#aeb3b8') + rect(12.4, 8, 7.2, 1.3, '#2b2219', 0, 'stroke="none"') + stroke('M16 4.2V13', '#6e747a', 1),
    shield:
      path('M3.5 14H13.5V24Q13.5 31 8.5 34Q3.5 31 3.5 24Z', WHITE) +
      rect(7.6, 15.5, 1.8, 16, RED, 0, 'stroke="none"') +
      rect(4.8, 19, 7.4, 1.8, RED, 0, 'stroke="none"'),
    weapon:
      rect(25.3, 5, 1.6, 18, '#d6dadc') +
      path('M26.1 2.4L27.1 5L25.1 5Z', '#d6dadc') +
      rect(22.8, 22.4, 6.6, 1.5, GOLD) +
      rect(25.3, 23.8, 1.6, 3.2, WOOD) +
      circ(26.1, 27.6, 1, GOLD),
  },
  ottomans: {
    skin: '#d2a070',
    tunic: '#2a4f9b',
    legs: 'pants',
    legColor: '#a8362a',
    boots: '#7a2a20',
    deco: rect(10.2, 23.4, 11.6, 2.2, '#c0392b', 0, 'stroke="none"') + stroke('M16 14.5V23', GOLD, 0.8),
    head:
      path('M19.5 3Q24 5 23 12Q21 9 20 8Z', WHITE) +
      path('M11.6 8Q11.2 3.5 13.5 0.8L19 0.8Q20.8 3.5 20.4 8Q16 6.4 11.6 8Z', WHITE) +
      stroke('M11.7 6.8Q16 5.4 20.3 6.8', GOLD, 1.2) +
      moustache('#2d2018'),
    weapon: `<g transform="rotate(20 24 22)">` + rect(23.6, 2, 1.2, 30, '#5a5a5e') + rect(22.9, 27, 2.6, 10, WOOD) + `</g>`,
  },
  byzantins: {
    tunic: '#2f4f8a',
    legs: 'pants',
    legColor: '#8a6a3a',
    boots: '#4a2f1a',
    deco: rect(10.2, 23.4, 11.6, 2, GOLD, 0, 'stroke="none"') + stroke('M16 14.5V23', GOLD, 0.9),
    head: path('M11.7 9Q12 4 16 1.8Q20 4 20.3 9L19.6 9L19.6 7.2L12.4 7.2L12.4 9Z', STEEL) + circ(16, 1.8, 1.2, '#b8362a'),
    shield: circ(8.5, 23, 6.3, RED) + stroke('M8.5 16.8V29.2M8.5 17.2Q12.2 17.2 12.2 19.6Q12.2 22 8.5 22M5.4 21.4L11.6 28.2M11.6 21.4L5.4 28.2', GOLD, 0.9),
    weapon: spear(),
  },
  ...NAPO_SOLDIER_SPECS,
  ...ASIA_SOLDIER_SPECS,
  ...MONGOL_ADV_SOLDIER_SPECS,
  ...ESP_SOLDIER_SPECS,
  ...SAINT_SOLDIER_SPECS,
} satisfies Record<Faction, Spec>;

/** Fabrique la chaîne SVG complète d'un soldat. */
export function soldierSvg(faction: Faction, frame: SoldierFrame = 0, state: SoldierState = 'marche'): string {
  const spec: Spec = SOLDIER_SPECS[faction];
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="32" height="40" role="img" ` +
    `aria-label="${faction}" focusable="false" style="overflow:visible">` +
    `<g stroke="${OUT}" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round">` +
    build(spec, frame, state) +
    `</g></svg>`
  );
}

export function Soldier(props: { faction: Faction; frame: SoldierFrame; state?: SoldierState; width?: number; height?: number }) {
  const { faction, frame, state, width = 32, height = 40 } = props;
  return (
    <span
      style={{ display: 'inline-block', width, height, lineHeight: 0 }}
      dangerouslySetInnerHTML={{
        __html: soldierSvg(faction, frame, state).replace('width="32" height="40"', `width="${width}" height="${height}"`),
      }}
    />
  );
}
