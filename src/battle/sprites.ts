import type { Faction } from '../types';
import { finishSvg, LEAN, poseFn, type SoldierPose } from './poses';

/**
 * Figurines d'un peuple. Toutes les images sont « larges » (marges de poses.ts : SPRITE_W unités au lieu de 32),
 * car une arme pointée en avant dépasse du dessin habituel.
 */
export interface FactionSprites {
  marche: [HTMLImageElement, HTMLImageElement];
  vaincu: [HTMLImageElement, HTMLImageElement];
  /** Pose de combat, rasterisée à la demande : `null` tant que l'image n'est pas prête (utiliser alors `marche`). */
  pose(pose: SoldierPose, frame: 0 | 1): HTMLImageElement | null;
  /** Couleur principale du camp. */
  color: string;
  /** Data URL de la figurine de marche, au format d'origine (légende). */
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
      const wide = (frame: 0 | 1, state: 'marche' | 'vaincu', pose: SoldierPose = 'marche') =>
        raster(finishSvg(soldierSvg(faction, frame, state, poseFn(pose)), LEAN[pose]));
      const [m0, m1, v0, v1] = await Promise.all([wide(0, 'marche'), wide(1, 'marche'), wide(0, 'vaincu'), wide(1, 'vaincu')]);
      const color = (FACTION_COLORS as Record<string, string>)[faction] ?? '#7a4a2a';
      const poses = new Map<string, HTMLImageElement | 'attente'>();
      const pose = (name: SoldierPose, frame: 0 | 1) => {
        if (name === 'marche') return frame ? m1 : m0;
        const key = `${name}${frame}`;
        const hit = poses.get(key);
        if (hit && hit !== 'attente') return hit;
        if (!hit) {
          poses.set(key, 'attente');
          wide(frame, 'marche', name).then(
            (img) => poses.set(key, img),
            () => poses.set(key, frame ? m1 : m0),
          );
        }
        return null;
      };
      const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(soldierSvg(faction, 0, 'marche'))}`;
      return { marche: [m0, m1], vaincu: [v0, v1], pose, color, url } satisfies FactionSprites;
    })();
    cache.set(faction, p);
    p.catch(() => cache.delete(faction));
  }
  return p;
}
