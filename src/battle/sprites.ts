import type { Faction } from '../types';

/** Quatre images par peuple : marche (2 pas) et vaincu (2 variantes, identiques si le dessin n'en a qu'une). */
export interface FactionSprites {
  marche: [HTMLImageElement, HTMLImageElement];
  vaincu: [HTMLImageElement, HTMLImageElement];
  /** Couleur principale du camp. */
  color: string;
  /** Data URL de la figurine de marche (légende). */
  url: string;
}

const cache = new Map<Faction, Promise<FactionSprites>>();

async function raster(svg: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  return img;
}

/** Rasterise (une seule fois par peuple) les figurines ; chargé avec le chunk de la fenêtre, pas dans le JS initial. */
export function loadSprites(faction: Faction): Promise<FactionSprites> {
  let p = cache.get(faction);
  if (!p) {
    p = (async () => {
      const [{ soldierSvg }, { FACTION_COLORS }] = await Promise.all([import('../figures/soldiers'), import('../figures/registry')]);
      const [m0, m1, v0, v1] = await Promise.all([
        raster(soldierSvg(faction, 0, 'marche')),
        raster(soldierSvg(faction, 1, 'marche')),
        raster(soldierSvg(faction, 0, 'vaincu')),
        raster(soldierSvg(faction, 1, 'vaincu')),
      ]);
      const color = (FACTION_COLORS as Record<string, string>)[faction] ?? '#7a4a2a';
      return { marche: [m0, m1], vaincu: [v0, v1], color, url: m0.src } satisfies FactionSprites;
    })();
    cache.set(faction, p);
    p.catch(() => cache.delete(faction));
  }
  return p;
}
