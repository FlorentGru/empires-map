import { FACTION_COLORS } from './colors';
import { ARCHETYPES, FACTIONS, type Archetype, type Faction } from '../types';
import { Character, CHARACTER_SPECS, characterSvg } from './characters';
import { Soldier, SOLDIER_SPECS, soldierSvg, type SoldierFrame, type SoldierState } from './soldiers';

export { characterSvg, soldierSvg };
export type { SoldierFrame, SoldierState };

export { FACTION_COLORS };

/** Composant React (démo) du soldat d'une faction. */
export const soldierFor = (faction: Faction) => (props: { frame: SoldierFrame; state?: SoldierState }) => Soldier({ faction, ...props });

/** Composant React (démo) du personnage d'un archétype. */
export const characterFor = (archetype: Archetype) => (props: { tint?: string }) => Character({ archetype, ...props });

/** Transforme une chaîne SVG en HTMLElement (conteneur <span>) pour un marqueur impératif. */
export function renderToElement(svg: string, opts: { className?: string; height?: number } = {}): HTMLElement {
  const el = document.createElement('span');
  el.style.display = 'inline-block';
  el.style.lineHeight = '0';
  if (opts.className) el.className = opts.className;
  el.innerHTML = svg;
  const root = el.firstElementChild;
  if (root && opts.height) {
    root.setAttribute('height', String(opts.height));
    const vb = root.getAttribute('viewBox')!.split(' ').map(Number);
    root.setAttribute('width', String((opts.height * vb[2]) / vb[3]));
  }
  return el;
}

/** Contrôle de complétude à l'exécution (le typage `satisfies` l'impose déjà à la compilation). */
export function checkFigures(): string[] {
  const errors: string[] = [];
  for (const f of FACTIONS) {
    if (!(f in SOLDIER_SPECS)) errors.push(`soldat manquant : ${f}`);
    if (!(f in FACTION_COLORS)) errors.push(`couleur manquante : ${f}`);
  }
  for (const a of ARCHETYPES) if (!(a in CHARACTER_SPECS)) errors.push(`personnage manquant : ${a}`);
  return errors;
}
