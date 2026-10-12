import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { TerritoryCollection } from '../data/loadEmpire';
import { prefersReducedMotion } from '../lib/motion';
import { variantFill, variantLine } from './color';

export const FILL_OPACITY = 0.48;
const LINE_OPACITY = 0.9;
export const CROSSFADE_MS = 800;

const EMPTY: TerritoryCollection = { type: 'FeatureCollection', features: [] };
const SLOTS = ['a', 'b'] as const;
type Slot = (typeof SLOTS)[number];

/** Ajoute à chaque Feature une couleur de remplissage et de contour (variation de teinte par entité). */
function decorate(fc: TerritoryCollection, color: string): TerritoryCollection {
  return {
    type: 'FeatureCollection',
    features: fc.features.map((f, i) => ({
      ...f,
      properties: { ...f.properties, _fill: variantFill(color, i), _line: variantLine(color, i) },
    })),
  };
}

/**
 * Deux emplacements alternés (a, b) : le nouveau territoire est écrit dans celui qui est
 * masqué puis les deux opacités basculent. Le fondu est assuré par les transitions de peinture
 * natives de MapLibre : une seule valeur cible par couche et par étape, rien par image.
 */
export class TerritoryLayers {
  private active: Slot | null = null;

  constructor(private map: MapLibreMap, beforeId?: string) {
    const transition = { duration: prefersReducedMotion() ? 0 : CROSSFADE_MS };
    for (const slot of SLOTS) {
      map.addSource(`territory-${slot}`, { type: 'geojson', data: EMPTY });
      map.addLayer(
        {
          id: `territory-${slot}-fill`,
          type: 'fill',
          source: `territory-${slot}`,
          paint: { 'fill-color': ['get', '_fill'], 'fill-opacity': 0, 'fill-opacity-transition': transition },
        },
        beforeId,
      );
      map.addLayer(
        {
          id: `territory-${slot}-line`,
          type: 'line',
          source: `territory-${slot}`,
          paint: { 'line-color': ['get', '_line'], 'line-width': 1.4, 'line-opacity': 0, 'line-opacity-transition': transition },
        },
        beforeId,
      );
    }
  }

  private setOpacity(slot: Slot, k: number) {
    this.map.setPaintProperty(`territory-${slot}-fill`, 'fill-opacity', FILL_OPACITY * k);
    this.map.setPaintProperty(`territory-${slot}-line`, 'line-opacity', LINE_OPACITY * k);
  }

  private instant<T>(fn: () => T): T {
    if (!this.fading) return fn();
    // Transition à 0 le temps de poser les valeurs, puis restauration (n'affecte que les changements suivants).
    for (const slot of SLOTS) this.setTransition(slot, 0);
    const r = fn();
    for (const slot of SLOTS) this.setTransition(slot, CROSSFADE_MS);
    return r;
  }

  private setTransition(slot: Slot, duration: number) {
    const t = { duration: prefersReducedMotion() ? 0 : duration, delay: 0 };
    this.map.setPaintProperty(`territory-${slot}-fill`, 'fill-opacity-transition', t);
    this.map.setPaintProperty(`territory-${slot}-line`, 'line-opacity-transition', t);
  }

  private fading = true;
  private prepared: Slot | null = null;

  /** Écrit le territoire dans l'emplacement masqué, sans l'afficher. */
  prepare(fc: TerritoryCollection, color: string) {
    const next: Slot = this.active === 'a' ? 'b' : 'a';
    (this.map.getSource(`territory-${next}`) as GeoJSONSource | undefined)?.setData(decorate(fc, color));
    this.prepared = next;
  }

  /** Masque aussitôt le territoire affiché (la couche morph prend le relais). */
  suspend() {
    if (!this.active) return;
    const a = this.active;
    this.instant(() => this.setOpacity(a, 0));
  }

  /** Affiche l'emplacement préparé (fondu, ou instantané pour la bascule depuis le morph). */
  commit(instant = false, fadeMs?: number) {
    const next = this.prepared;
    if (!next) return;
    if (fadeMs !== undefined && !instant) {
      // Fondu court (relais depuis le glissement), puis retour à la durée habituelle.
      for (const slot of SLOTS) this.setTransition(slot, fadeMs);
      this.setOpacity(next, 1);
      if (this.active) this.setOpacity(this.active, 0);
      this.active = next;
      this.prepared = null;
      window.setTimeout(() => {
        for (const slot of SLOTS) this.setTransition(slot, CROSSFADE_MS);
      }, fadeMs + 30);
      return;
    }
    const apply = () => {
      this.setOpacity(next, 1);
      if (this.active) this.setOpacity(this.active, 0);
    };
    if (instant) this.instant(apply);
    else apply();
    this.active = next;
    this.prepared = null;
  }

  show(fc: TerritoryCollection, color: string) {
    this.prepare(fc, color);
    this.commit();
  }

  destroy() {}
}
