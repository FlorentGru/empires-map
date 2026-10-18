import { ARCHETYPES, FACTIONS, type Archetype, type Faction } from '../types';
import { Character, CHARACTER_SPECS, characterSvg } from './characters';
import { Soldier, SOLDIER_SPECS, soldierSvg, type SoldierFrame, type SoldierState } from './soldiers';

export { characterSvg, soldierSvg };
export type { SoldierFrame, SoldierState };

/** Couleur principale du camp (trajets pointillés, légende). */
export const FACTION_COLORS = {
  romains: '#a8281e',
  latins: '#c58a3d',
  samnites: '#7a4a2a',
  carthaginois: '#6d2f86',
  gaulois: '#2f7a52',
  'grecs-macedoniens': '#2f5f9b',
  germains: '#6b5a3a',
  'parthes-perses': '#2f6f7a',
  egyptiens: '#c9a02a',
  daces: '#8a6a2a',
  'goths-vandales': '#5a6a7a',
  arabes: '#2f8a4a',
  'turcs-seldjoukides': '#1f7fa0',
  'croises-latins': '#7b7f8c',
  ottomans: '#e07b1a',
  byzantins: '#7a1f5a',
  francais: '#2f4fa8',
  britanniques: '#c0282a',
  autrichiens: '#a89f86',
  prussiens: '#1c2b54',
  russes: '#2f6a3a',
  espagnols: '#d6a81c',
  portugais: '#5e3b22',
  polonais: '#a3123a',
  chinois: '#c0392b',
  xiongnu: '#8a6a4a',
  mongols: '#2a5fa0',
  jurchens: '#4a6a3a',
  mandchous: '#d4a017',
  japonais: '#b8325a',
  coreens: '#3a8f9f',
  tibetains: '#8a2a20',
  vietnamiens: '#7a9a2a',
  'turcs-gokturks': '#4a7aa8',
  khitans: '#a85a2a',
  ouighours: '#8a3a9a',
  tangoutes: '#9a4a2a',
  khwarezmiens: '#1f8a7a',
  rus: '#7a2a5a',
  'chevaliers-europeens': '#2a4f9a',
  mamelouks: '#c9921a',
  tercios: '#b8860b',
  azteques: '#1f8a6a',
  incas: '#c4501f',
  'francais-ancien-regime': '#3a6fc4',
  neerlandais: '#e8731a',
  'anglais-elisabethains': '#9a1f2e',
  'espagnols-xxe': '#8a8a2f',
  rifains: '#6a4a2a',
  americains: '#1f3f7a',
  independantistes: '#2a8f5a',
} satisfies Record<Faction, string>;

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
