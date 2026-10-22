// Sprites illustrés (src/figures). Les figurines regardent vers la droite.
// Les dessins SVG (~90 Ko source) ne sont pas dans le JS initial : `loadSprites()` les charge en parallèle du reste,
// et les calques de la carte attendent cette promesse avant de se créer (donc aucun sprite vide).
import { useEffect, useState } from 'react';
import type { Archetype, Faction } from '../types';
import type { SoldierFrame, SoldierState } from '../figures/registry';

export { FACTION_COLORS } from '../figures/colors';

type Lib = typeof import('../figures/registry');
let lib: Lib | null = null;
let pending: Promise<Lib> | null = null;

export function loadSprites(): Promise<Lib> {
  return (pending ??= import('../figures/registry').then((m) => (lib = m)));
}
void loadSprites();

/** Vrai quand les dessins sont chargés (pour re-rendre un composant React). */
export const spritesReady = (): boolean => lib !== null;

export const soldierSvg = (faction: Faction, frame: SoldierFrame = 0, state: SoldierState = 'marche'): string =>
  lib ? lib.soldierSvg(faction, frame, state) : '';

export const characterSvg = (archetype: Archetype, tint?: string): string => (lib ? lib.characterSvg(archetype, tint) : '');

/** Hook : renvoie vrai dès que les dessins sont chargés (re-rend le composant à ce moment). */
export function useSprites(): boolean {
  const [ready, setReady] = useState(spritesReady);
  useEffect(() => {
    if (!ready) void loadSprites().then(() => setReady(true));
  }, [ready]);
  return ready;
}
