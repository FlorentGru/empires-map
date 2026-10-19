import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import type { TerritoryProperties } from '../types';
import type { TerritoryCollection } from '../data/loadEmpire';
import { prefersReducedMotion } from '../lib/motion';
import { variantFill, variantLine, variantVassal } from './color';

export const FILL_OPACITY = 0.48;
const LINE_OPACITY = 0.9;
export const CROSSFADE_MS = 800;

const EMPTY: TerritoryCollection = { type: 'FeatureCollection', features: [] };
/** Entités non « core » : contour en tirets. */
const DASHED = ['match', ['get', 'status'], ['vassal', 'allied'], true, false] as never;
const SOLID = ['!', DASHED] as never;
const FILL_COLOR = ['match', ['get', 'status'], 'allied', 'rgba(0,0,0,0)', 'vassal', ['get', '_fillV'], ['get', '_fill']] as never;
const SLOTS = ['a', 'b'] as const;
type Slot = (typeof SLOTS)[number];
const HOVER_SRC = 'territory-hover';
/** Couches cliquables dessinées au-dessus des territoires : un clic sur elles n'ouvre pas la fiche de région. */
const CLICKABLE_ABOVE = ['monuments-icons', 'inventions-icons', 'trade-routes-hit', 'trade-routes-stops', 'disasters-spread'];

export type RegionFeature = Feature<Polygon | MultiPolygon, TerritoryProperties>;
/** Clic sur une région : entité complète (géométrie d'origine, pas celle découpée par les tuiles). */
export type RegionPick = (f: RegionFeature, clientX: number, clientY: number) => void;

/** Ajoute à chaque Feature une couleur de remplissage et de contour (variation de teinte par entité). */
function decorate(fc: TerritoryCollection, color: string): TerritoryCollection {
  return {
    type: 'FeatureCollection',
    features: fc.features.map((f, i) => ({
      ...f,
      properties: { ...f.properties, _fill: variantFill(color, i), _fillV: variantVassal(color, i), _line: variantLine(color, i) },
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

  constructor(
    private map: MapLibreMap,
    beforeId?: string,
  ) {
    const transition = { duration: prefersReducedMotion() ? 0 : CROSSFADE_MS };
    for (const slot of SLOTS) {
      // generateId : l'id de chaque entité rendue = son rang dans la collection (retrouvée dans `data`).
      map.addSource(`territory-${slot}`, { type: 'geojson', data: EMPTY, generateId: true });
      map.addLayer(
        {
          id: `territory-${slot}-fill`,
          type: 'fill',
          source: `territory-${slot}`,
          paint: { 'fill-color': FILL_COLOR, 'fill-opacity': 0, 'fill-opacity-transition': transition },
        },
        beforeId,
      );
      map.addLayer(
        {
          id: `territory-${slot}-line`,
          type: 'line',
          source: `territory-${slot}`,
          filter: SOLID,
          paint: { 'line-color': ['get', '_line'], 'line-width': 1.4, 'line-opacity': 0, 'line-opacity-transition': transition },
        },
        beforeId,
      );
      map.addLayer(
        {
          id: `territory-${slot}-dash`,
          type: 'line',
          source: `territory-${slot}`,
          filter: DASHED,
          paint: { 'line-color': ['get', '_line'], 'line-width': 1.6, 'line-dasharray': [3, 2], 'line-opacity': 0, 'line-opacity-transition': transition },
        },
        beforeId,
      );
    }
    // Région survolée : voile clair et contour épais, au-dessus des deux emplacements.
    map.addSource(HOVER_SRC, { type: 'geojson', data: EMPTY });
    map.addLayer({ id: 'territory-hover-fill', type: 'fill', source: HOVER_SRC, paint: { 'fill-color': '#fff8e6', 'fill-opacity': 0.22 } }, beforeId);
    map.addLayer(
      {
        id: 'territory-hover-line',
        type: 'line',
        source: HOVER_SRC,
        layout: { 'line-join': 'round' },
        paint: { 'line-color': ['get', '_line'], 'line-width': 2.6, 'line-opacity': 0.95 },
      },
      beforeId,
    );
    // Écoute globale (pas par couche) : l'emplacement masqué, à opacité 0, est ignoré.
    map.on('mousemove', this.onMove);
    map.on('mouseout', this.onLeave);
    map.on('click', this.onClick);
  }

  /* ---------- Régions : survol et clic (seulement quand la carte est à l'arrêt) ---------- */

  /** Collection décorée de chaque emplacement (pour retrouver l'entité survolée par son id). */
  private data: Record<Slot, TerritoryCollection> = { a: EMPTY, b: EMPTY };
  private interactive = false;
  private hovered: number | null = null;
  onPick: RegionPick | null = null;

  /** Survol et clic actifs (à l'arrêt) ou non (lecture, glissement, question en cours). */
  setInteractive(on: boolean) {
    this.interactive = on;
    if (!on) this.setHover(null);
  }

  /** Rang de l'entité de l'emplacement affiché sous le point (null : aucune, ou inactif). */
  private pick(e: MapMouseEvent): number | null {
    if (!this.interactive || !this.active || !this.map.getLayer(`territory-${this.active}-fill`)) return null;
    const id = this.map.queryRenderedFeatures(e.point, { layers: [`territory-${this.active}-fill`] })[0]?.id;
    return typeof id === 'number' ? id : null;
  }

  private setHover(id: number | null) {
    if (id === this.hovered) return;
    this.hovered = id;
    const f = id === null || !this.active ? undefined : this.data[this.active].features[id];
    (this.map.getSource(HOVER_SRC) as GeoJSONSource | undefined)?.setData(f ? { type: 'FeatureCollection', features: [f] } : EMPTY);
    // On ne touche au curseur qu'en entrant dans une région ou en la quittant (setHover ne passe ici qu'aux changements).
    this.map.getCanvas().style.cursor = f ? 'pointer' : '';
  }

  private onMove = (e: MapMouseEvent) => {
    if (this.interactive) this.setHover(this.pick(e));
  };

  private onLeave = () => this.setHover(null);

  private onClick = (e: MapMouseEvent) => {
    const id = this.pick(e);
    if (id === null || !this.active || !this.onPick) return;
    const above = CLICKABLE_ABOVE.filter((l) => this.map.getLayer(l));
    if (above.length && this.map.queryRenderedFeatures(e.point, { layers: above }).length) return;
    const f = this.data[this.active].features[id];
    if (f) this.onPick(f, e.originalEvent.clientX, e.originalEvent.clientY);
  };

  private setOpacity(slot: Slot, k: number) {
    this.map.setPaintProperty(`territory-${slot}-fill`, 'fill-opacity', FILL_OPACITY * k);
    this.map.setPaintProperty(`territory-${slot}-line`, 'line-opacity', LINE_OPACITY * k);
    this.map.setPaintProperty(`territory-${slot}-dash`, 'line-opacity', LINE_OPACITY * k);
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
    this.map.setPaintProperty(`territory-${slot}-dash`, 'line-opacity-transition', t);
  }

  private fading = true;
  private prepared: Slot | null = null;

  /** Écrit le territoire dans l'emplacement masqué, sans l'afficher. */
  prepare(fc: TerritoryCollection, color: string) {
    const next: Slot = this.active === 'a' ? 'b' : 'a';
    this.data[next] = decorate(fc, color);
    (this.map.getSource(`territory-${next}`) as GeoJSONSource | undefined)?.setData(this.data[next]);
    this.prepared = next;
  }

  /** Masque aussitôt le territoire affiché (la couche morph prend le relais). */
  suspend() {
    if (!this.active) return;
    this.setHover(null);
    const a = this.active;
    this.instant(() => this.setOpacity(a, 0));
  }

  /** Affiche l'emplacement préparé (fondu, ou instantané pour la bascule depuis le morph). */
  commit(instant = false, fadeMs?: number) {
    const next = this.prepared;
    if (!next) return;
    this.setHover(null);
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

  destroy() {
    this.map.off('mousemove', this.onMove);
    this.map.off('mouseout', this.onLeave);
    this.map.off('click', this.onClick);
  }
}
