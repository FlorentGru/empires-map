import { useEffect, useState } from 'react';
import type { Disaster } from '../types-disaster';
import type { Monument } from '../types-monument';
import type { TradeRoute } from '../types-route';

/**
 * Données du « monde de l'époque » (catastrophes, routes commerciales, monuments), chargées à la demande :
 * la carte s'affiche sans les attendre, et leurs calques se remplissent à leur arrivée.
 */
export const WORLD: { disasters: Disaster[]; routes: TradeRoute[]; monuments: Monument[] } = { disasters: [], routes: [], monuments: [] };

let promise: Promise<typeof WORLD> | null = null;
let loaded = false;

export function loadWorld(): Promise<typeof WORLD> {
  promise ??= Promise.all([import('../../data/disasters.json'), import('../../data/routes.json'), import('../../data/monuments.json')]).then(([d, r, m]) => {
    WORLD.disasters = d.default as Disaster[];
    WORLD.routes = r.default as TradeRoute[];
    WORLD.monuments = m.default as Monument[];
    loaded = true;
    return WORLD;
  });
  return promise;
}

/** Les données du monde pour un composant React (listes vides le temps du chargement). */
export function useWorld(): typeof WORLD {
  const [, setReady] = useState(loaded);
  useEffect(() => {
    if (!loaded) void loadWorld().then(() => setReady(true));
  }, []);
  return WORLD;
}
