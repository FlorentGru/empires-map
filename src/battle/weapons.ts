/** Armes de la fenêtre de bataille : qui tire, avec quoi, à quel rythme. Pur, sans DOM. */
import type { Faction } from '../types';
import type { BattleUnitKind } from '../types-battle';
import { MUZZLE } from './poses';

export type Firearm = 'fusil' | 'arquebuse';
/** `bordee` : salve des navires à canons ; `canon` : pièce d'artillerie. */
export type Weapon = Firearm | 'arc' | 'canon' | 'bordee';

/** Peuples dont le soldat (src/figures/soldiers.tsx) porte un fusil (`musket()`). */
const FUSIL = new Set<Faction>([
  'francais',
  'britanniques',
  'autrichiens',
  'prussiens',
  'russes',
  'espagnols',
  'portugais',
  'espagnols-xxe',
  'rifains',
  'americains',
  'independantistes',
  'suedois',
]);
/** Peuples dont le soldat porte une arquebuse à mèche (`arquebus()`). */
const ARQUEBUSE = new Set<Faction>(['tercios', 'neerlandais']);

export function firearmOf(faction: Faction | undefined): Firearm | null {
  if (!faction) return null;
  if (FUSIL.has(faction)) return 'fusil';
  if (ARQUEBUSE.has(faction)) return 'arquebuse';
  return null;
}

/** Arme de tir d'une unité, ou null si elle ne tire pas (mêlée). */
export function weaponOf(kind: BattleUnitKind, faction: Faction | undefined): Weapon | null {
  if (kind === 'artillerie') return 'canon';
  if (kind === 'archers') return 'arc';
  if (kind === 'infanterie') return firearmOf(faction);
  if (kind === 'navires') return firearmOf(faction) ? 'bordee' : null;
  return null;
}

export function isRanged(unit: { kind: BattleUnitKind }, faction: Faction | undefined): boolean {
  return weaponOf(unit.kind, faction) !== null;
}

/** Bouche du canon dans le repère de cannon.ts (largeurs de figurine) : devant et au-dessus du sol. */
export const CANNON_MUZZLE = { dx: 1.05, dz: 0.62 };

/** Rythme et effets d'un tir. Durées en secondes, tailles en largeurs de figurine. */
export interface WeaponFx {
  /** Visée avant le coup. */
  vise: number;
  /** Durée de la pose de tir (éclair). */
  tir: number;
  /** Rechargement : minimum et étendue (choisie par unité). */
  reload: [number, number];
  puffs: number;
  smokeLife: number;
  smokeSize: number;
  smokeGrow: number;
  flash: number;
}

export const WEAPON_FX: Record<Weapon, WeaponFx> = {
  fusil: { vise: 0.5, tir: 0.12, reload: [2.5, 1], puffs: 3, smokeLife: 2.5, smokeSize: 0.5, smokeGrow: 1.4, flash: 0.5 },
  arquebuse: { vise: 0.5, tir: 0.12, reload: [4, 1], puffs: 3, smokeLife: 2.8, smokeSize: 0.55, smokeGrow: 1.5, flash: 0.6 },
  arc: { vise: 0.5, tir: 0.12, reload: [1.2, 0.3], puffs: 0, smokeLife: 0, smokeSize: 0, smokeGrow: 0, flash: 0 },
  canon: { vise: 0.5, tir: 0.12, reload: [3, 1], puffs: 4, smokeLife: 4, smokeSize: 1.1, smokeGrow: 2.8, flash: 1.1 },
  bordee: { vise: 0.5, tir: 0.12, reload: [6, 3], puffs: 3, smokeLife: 3.6, smokeSize: 0.7, smokeGrow: 1.4, flash: 0.9 },
};

/** Bouche de l'arme dans le repère de la figurine : décalage en avant (dx) et hauteur (dz), en largeurs de figurine. */
export function muzzleOf(weapon: Weapon): { dx: number; dz: number } {
  if (weapon === 'canon') return CANNON_MUZZLE;
  if (weapon === 'bordee') return { dx: 0, dz: 0.4 };
  const [mx, my] = MUZZLE[weapon];
  return { dx: (mx - 16) / 32, dz: (36.8 - my) / 32 };
}
