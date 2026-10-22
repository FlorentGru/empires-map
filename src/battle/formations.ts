/**
 * Disposition des figurines d'un bloc selon sa formation. PUR et déterministe (le même appel donne toujours la même
 * disposition ; les résultats sont mis en cache). L'avant du bloc regarde l'ennemi (`facing` : 1 vers la droite).
 */
import type { BattleFormation, BattleUnitKind } from '../types-battle';
import { hash01 } from './hash';

/** Place d'une figurine dans son bloc, par rapport au centre du bloc (unités de terrain). */
export interface Slot {
  dx: number;
  dy: number;
  /** Rang : 0 pour le premier (le plus proche de l'ennemi, ou la face extérieure du carré). */
  rank: number;
  /** Sens de la figurine (1 : droite, -1 : gauche). Seul le carré en tourne certaines vers l'arrière. */
  dir: 1 | -1;
  /** Arme longue (sarisse, pique) : `basse` toujours pointée en avant, `haute` toujours dressée, `combat` baissée au combat. */
  lance?: 'basse' | 'haute' | 'combat';
  /** `tir` : tireur d'une manche (tercio) ; `pique` : piquier du carré central. */
  role?: 'tir' | 'pique';
  /** Boucliers en toit au-dessus de sa tête (tortue). */
  toit?: boolean;
  /** Bombement vers l'ennemi (croissant), à doser selon le mouvement de l'unité. */
  bulge?: number;
  /** Numéro du navire qui porte la figurine (kind `navires`). */
  ship?: number;
}

export const SPACE_ALONG = 1.7;
export const SPACE_DEPTH = 1.4;
/** Équipage d'un navire : nombre de figurines posées sur une coque. */
export const CREW = 4;
/** Longueur d'une coque et écarts entre navires (unités de terrain). */
export const SHIP = { pitchAlong: 4.5, pitchDepth: 9.5, crewStep: 1.55 };

/** Écartement selon la monture (une figurine de cavalerie est environ 1,5 fois plus large qu'un fantassin). */
const SPREAD: Partial<Record<BattleUnitKind, [number, number]>> = {
  cavalerie: [1.5, 2.4],
  'archers-montes': [1.5, 2.4],
  elephants: [1.9, 4.4],
  chars: [2, 3.8],
  brulots: [1.5, 2.5],
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const cache = new Map<string, Slot[]>();

/** Dispositions de n figurines (dans l'ordre d'apparition). */
export function layoutOf(formation: BattleFormation, n: number, facing: 1 | -1, kind: BattleUnitKind = 'infanterie'): Slot[] {
  const key = `${formation}|${n}|${facing}|${kind}`;
  let out = cache.get(key);
  if (!out) {
    out = build(formation, n, facing, kind);
    cache.set(key, out);
  }
  return out;
}

function build(formation: BattleFormation, n: number, facing: 1 | -1, kind: BattleUnitKind): Slot[] {
  if (kind === 'navires') return fleet(formation, n, facing);
  const [fa, fd] = SPREAD[kind] ?? [1, 1];
  const sa = SPACE_ALONG * fa;
  const sd = SPACE_DEPTH * fd;
  switch (formation) {
    case 'coin':
      return wedge(n, facing, sa, sd);
    case 'carre':
      return hollowSquare(n, facing, fa, fd);
    case 'quinconce':
      return quincunx(n, facing, fa, fd);
    case 'tercio':
      return tercio(n, facing, fa, fd);
    case 'tirailleurs':
      return skirmishers(n, facing, fa, fd);
    case 'mince':
      return grid(n, Math.ceil(n / 2), facing, sa, sd);
    case 'colonne':
      return grid(n, Math.ceil(Math.sqrt(n / 2.5)), facing, sa, sd);
    case 'phalange': {
      const rows = clamp(Math.round(Math.sqrt(n * 1.4)), 2, 16);
      return grid(n, Math.ceil(n / rows), facing, sa * 0.78, sd * 0.78, (row) => ({ lance: row < 5 ? 'basse' : 'haute' }));
    }
    case 'tortue': {
      const cols = Math.ceil(Math.sqrt(n * 1.8));
      return grid(n, cols, facing, sa * 0.72, sd * 0.78, (row, col) => ({ toit: row >= 1 && (cols <= 2 || (col > 0 && col < cols - 1)) }));
    }
    case 'croissant': {
      const cols = Math.max(1, Math.ceil(Math.sqrt(n * 2.5)));
      const amp = clamp(cols * 0.35, 1.5, 7) * (fd > 1 ? 1.5 : 1);
      return grid(n, cols, facing, sa, sd, (_row, col, c) => {
        const t = c > 1 ? (col - (c - 1) / 2) / ((c - 1) / 2) : 0;
        return { bulge: (1 - t * t) * amp * facing };
      });
    }
    default:
      return grid(n, Math.ceil(Math.sqrt(n * 2.5)), facing, sa, sd);
  }
}

/** Grille régulière de `cols` colonnes ; le rang 0 est devant. `extra` ajoute des attributs selon (rang, colonne, colonnes). */
function grid(
  n: number,
  colsWanted: number,
  facing: 1 | -1,
  sa: number,
  sd: number,
  extra?: (row: number, col: number, cols: number) => Partial<Slot>,
): Slot[] {
  const cols = Math.max(1, Math.min(colsWanted, n));
  const rows = Math.ceil(n / cols);
  return Array.from({ length: n }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return { dx: ((rows - 1) / 2 - row) * sd * facing, dy: (col - (cols - 1) / 2) * sa, rank: row, dir: facing, ...extra?.(row, col, cols) };
  });
}

/** Coin en V : la pointe (rang 0) en avant, les rangs s'élargissent derrière. */
function wedge(n: number, facing: 1 | -1, sa: number, sd: number): Slot[] {
  const kmax = Math.floor(Math.sqrt(Math.max(0, n - 1)));
  return Array.from({ length: n }, (_, i) => {
    const k = Math.floor(Math.sqrt(i));
    const j = i - k * k;
    return { dx: (kmax / 2 - k) * sd * facing, dy: (j - k) * sa * 0.8, rank: k, dir: facing };
  });
}

/**
 * Carré creux (un ou deux anneaux) : les figurines sont réparties sur le pourtour. Chaque face regarde vers l'extérieur :
 * face avant (côté ennemi) vers l'ennemi, face arrière vers l'arrière, les deux côtés en miroir (le côté haut regarde
 * comme la face avant, le côté bas comme la face arrière, car la vue de côté n'a pas d'autre sens à montrer).
 */
function hollowSquare(n: number, facing: 1 | -1, fa: number, fd: number): Slot[] {
  const rings = n > 24 ? 2 : 1;
  const capacity = (s: number) => {
    let c = 0;
    for (let k = 0; k < rings; k++) c += s - 2 * k >= 2 ? 4 * (s - 2 * k - 1) : s - 2 * k === 1 ? 1 : 0;
    return c;
  };
  let side = 2;
  while (capacity(side) < n) side++;
  const cells: { ux: number; uy: number; ring: number }[] = [];
  for (let k = 0; k < rings; k++) {
    const s = side - 2 * k;
    if (s < 1) break;
    if (s === 1) {
      cells.push({ ux: 0, uy: 0, ring: k });
      continue;
    }
    const h = (s - 1) / 2;
    for (let c = 0; c < s - 1; c++) cells.push({ ux: -h + c, uy: -h, ring: k }); // haut, gauche -> droite
    for (let c = 0; c < s - 1; c++) cells.push({ ux: h, uy: -h + c, ring: k }); // droite, haut -> bas
    for (let c = 0; c < s - 1; c++) cells.push({ ux: h - c, uy: h, ring: k }); // bas, droite -> gauche
    for (let c = 0; c < s - 1; c++) cells.push({ ux: -h, uy: h - c, ring: k }); // gauche, bas -> haut
  }
  return Array.from({ length: n }, (_, i) => {
    const cell = cells[Math.min(cells.length - 1, Math.floor(((i + 0.5) * cells.length) / n))]!;
    const a = cell.ux * facing; // > 0 : côté de l'ennemi
    const dir: 1 | -1 = Math.abs(a) >= Math.abs(cell.uy) ? (a >= 0 ? facing : (-facing as 1 | -1)) : cell.uy < 0 ? facing : (-facing as 1 | -1);
    return { dx: cell.ux * 1.45 * fd, dy: cell.uy * 1.6 * fa, rank: cell.ring, dir };
  });
}

/** Manipules en damier sur trois lignes (hastats devant, princes, triaires derrière), avec des intervalles. */
function quincunx(n: number, facing: 1 | -1, fa: number, fd: number): Slot[] {
  const maniples = n < 6 ? 1 : clamp(Math.round(n / 5), 3, 12);
  const counts = Array.from({ length: maniples }, (_, k) => Math.floor(((k + 1) * n) / maniples) - Math.floor((k * n) / maniples));
  const shape = counts.map((c) => {
    const cols = Math.max(1, Math.ceil(Math.sqrt(c * 1.6)));
    return { cols, rows: Math.ceil(c / cols) };
  });
  const colStep = 1.45 * fa;
  const rowStep = 1.25 * fd;
  const gapY = Math.max(...shape.map((s) => s.cols)) * colStep + 1.9;
  const gapX = Math.max(...shape.map((s) => s.rows)) * rowStep + 2.1;
  const perLine = Math.ceil(maniples / 3);
  const out: Slot[] = [];
  counts.forEach((count, k) => {
    const line = k % 3;
    const idx = Math.floor(k / 3);
    const { cols, rows } = shape[k]!;
    const cx = (1 - line) * gapX * facing;
    const cy = (idx - (perLine - 1) / 2) * gapY + (line === 1 ? gapY / 2 : 0);
    for (let j = 0; j < count; j++) {
      const col = j % cols;
      const row = Math.floor(j / cols);
      out.push({ dx: cx + ((rows - 1) / 2 - row) * rowStep * facing, dy: cy + (col - (cols - 1) / 2) * colStep, rank: line, dir: facing });
    }
  });
  return out;
}

/** Tercio : carré de piquiers au centre (arme levée, baissée au combat) et quatre manches de tireurs aux coins. */
function tercio(n: number, facing: 1 | -1, fa: number, fd: number): Slot[] {
  const s = n >= 12 ? Math.max(1, Math.round(n * 0.1)) : n >= 5 ? 1 : 0;
  const np = n - 4 * s;
  const colStep = 1.5 * fa;
  const rowStep = 1.3 * fd;
  const cols = Math.max(1, Math.ceil(Math.sqrt(np)));
  const rows = Math.ceil(np / cols);
  const out: Slot[] = [];
  for (let i = 0; i < np; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    out.push({ dx: ((rows - 1) / 2 - row) * rowStep * facing, dy: (col - (cols - 1) / 2) * colStep, rank: row, dir: facing, role: 'pique', lance: 'combat' });
  }
  if (s === 0) return out;
  const sc = Math.max(1, Math.ceil(Math.sqrt(s)));
  const sr = Math.ceil(s / sc);
  const offX = ((rows - 1) / 2) * rowStep + 1.8 + ((sr - 1) / 2) * rowStep;
  const offY = ((cols - 1) / 2) * colStep + 1.8 + ((sc - 1) / 2) * colStep;
  for (let m = 0; m < 4; m++) {
    const cx = (m % 2 === 0 ? 1 : -1) * offX * facing;
    const cy = (m < 2 ? -1 : 1) * offY;
    for (let j = 0; j < s; j++) {
      const col = j % sc;
      const row = Math.floor(j / sc);
      out.push({ dx: cx + ((sr - 1) / 2 - row) * rowStep * facing, dy: cy + (col - (sc - 1) / 2) * colStep, rank: row, dir: facing, role: 'tir' });
    }
  }
  return out;
}

/** Tirailleurs : petits groupes de quatre, très espacés, avec un jitter déterministe plus fort que les autres formations. */
function skirmishers(n: number, facing: 1 | -1, fa: number, fd: number): Slot[] {
  const per = 4;
  const groups = Math.ceil(n / per);
  const gCols = Math.max(1, Math.ceil(Math.sqrt(groups * 1.6)));
  const gRows = Math.ceil(groups / gCols);
  const inA = 2.9 * fa;
  const inD = 2.6 * fd;
  const pitchA = inA * 2 + 4.5;
  const pitchD = inD * 2 + 3.5;
  const k = Math.min(1, 38 / Math.max(1, gCols * pitchA), 30 / Math.max(1, gRows * pitchD));
  return Array.from({ length: n }, (_, i) => {
    const g = Math.floor(i / per);
    const j = i % per;
    const gc = g % gCols;
    const gr = Math.floor(g / gCols);
    const jx = (hash01(`tir${i}x`) - 0.5) * inD * 0.9;
    const jy = (hash01(`tir${i}y`) - 0.5) * inA * 0.9;
    return {
      dx: (((gRows - 1) / 2 - gr) * pitchD * k + (1 - Math.floor(j / 2) - 0.5) * inD + jx) * facing,
      dy: (gc - (gCols - 1) / 2) * pitchA * k + ((j % 2) - 0.5) * inA + jy,
      rank: gr,
      dir: facing,
    };
  });
}

/** Flotte : chaque navire porte CREW figurines alignées sur le pont ; les navires forment une ligne (ou une colonne). */
function fleet(formation: BattleFormation, n: number, facing: 1 | -1): Slot[] {
  const ships = Math.ceil(n / CREW);
  const along = Math.max(1, Math.min(ships, formation === 'colonne' ? Math.ceil(Math.sqrt(ships / 2.5)) : Math.ceil(Math.sqrt(ships * 2))));
  const rows = Math.ceil(ships / along);
  return Array.from({ length: n }, (_, i) => {
    const ship = Math.floor(i / CREW);
    const m = i % CREW;
    const crew = Math.min(CREW, n - ship * CREW);
    const col = ship % along;
    const row = Math.floor(ship / along);
    return {
      dx: ((rows - 1) / 2 - row) * SHIP.pitchDepth * facing + (m - (crew - 1) / 2) * SHIP.crewStep * facing,
      dy: (col - (along - 1) / 2) * SHIP.pitchAlong,
      rank: row,
      dir: facing,
      ship,
    };
  });
}
