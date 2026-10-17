import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import type { Feature, FeatureCollection, Point } from 'geojson';
import { INVENTIONS, OPEN_INVENTION_EVENT, takeInventionOpen } from '../data/loadInventions';
import { INVENTION_CATEGORIES, type Invention } from '../types-invention';
import { formatYear } from '../lib/years';
import { prefersReducedMotion } from '../lib/motion';
import { closeMapCard, openMapCard } from './mapCard';
import { addSvgImages } from './svgImages';
import { CATEGORY_LABELS, inventionIconSvg } from './inventionIcons';
import { pileFanFor, type PileFan, type PileSource } from './pileFan';

const SRC = 'inventions';
const IDS = ['inventions-glow', 'inventions-icons'];

type Props = { id: string; category: string; name: string; fresh: boolean };

/**
 * Inventions révolutionnaires de l'empire affiché (data/empires/<id>/inventions.json) : visibles une fois
 * apparues ; celles apparues depuis l'étape précédente ont un halo doré et leur nom affiché. Clic → fiche.
 */
export class InventionLayers {
  private ready: Promise<void>;
  private empire = '';
  private year = 0;
  private prev = -Infinity;
  private enabled = true;
  /** Invention montrée en aperçu (clic sur la frise) même si elle n'est pas encore apparue. */
  private previewId: string | null = null;
  /** Inventions d'une même ville empilées : badge de nombre et éventail au survol, comme les monuments. */
  private fan: PileFan;
  private pile: PileSource;

  constructor(private map: MapLibreMap) {
    this.fan = pileFanFor(map);
    this.pile = {
      layer: 'inventions-icons',
      locate: (id) => this.find(id)?.at,
      item: (id) => {
        const inv = this.find(id);
        return inv && { name: inv.name, iconSvg: inventionIconSvg(inv.category) };
      },
      onPick: (id, x, y) => {
        const inv = this.find(id);
        if (inv) this.openCard(inv, x, y, inv.id === this.previewId ? this.previewNote(inv) : undefined);
      },
      onHidden: (ids) => this.hide(ids),
    };
    this.fan.register(this.pile);
    this.ready = addSvgImages(map, INVENTION_CATEGORIES.map((c) => [`invention-${c}`, inventionIconSvg(c), 28] as [string, string, number])).then(() => {
      if (!map.getStyle() || map.getSource(SRC)) return;
      const before = map.getLayer('city-dot') ? 'city-dot' : undefined;
      map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer(
        {
          id: 'inventions-glow',
          type: 'circle',
          source: SRC,
          filter: ['==', ['get', 'fresh'], true],
          paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 14, 6, 22] as never, 'circle-color': '#f2c14e', 'circle-opacity': 0.45, 'circle-blur': 0.6 },
        },
        before,
      );
      map.addLayer(
        {
          id: 'inventions-icons',
          type: 'symbol',
          source: SRC,
          layout: {
            'icon-image': ['concat', 'invention-', ['get', 'category']] as never,
            'icon-size': ['interpolate', ['linear'], ['zoom'], 2, ['case', ['get', 'fresh'], 0.8, 0.6], 6, ['case', ['get', 'fresh'], 1.15, 0.9]] as never,
            'icon-allow-overlap': true,
            // Nom affiché pour les nouvelles inventions, sinon à partir du zoom 4,5.
            // (le zoom doit être au premier niveau de l'expression : « step » englobe le « case »)
            'text-field': ['step', ['zoom'], ['case', ['get', 'fresh'], ['concat', '💡 ', ['get', 'name']], ''], 4.5, ['case', ['get', 'fresh'], ['concat', '💡 ', ['get', 'name']], ['get', 'name']]] as never,
            'text-font': ['Open Sans Semibold'],
            'text-size': ['case', ['get', 'fresh'], 12, 10.5] as never,
            'text-offset': [0, 1.4],
            'text-anchor': 'top',
            'text-max-width': 10,
            'text-optional': true,
          },
          paint: { 'text-color': '#1f4f57', 'text-halo-color': '#f7efd9', 'text-halo-width': 2 },
        },
        before,
      );
      map.on('click', 'inventions-icons', this.onClick);
      map.on('mouseenter', 'inventions-icons', this.onEnter);
      map.on('mouseleave', 'inventions-icons', this.onLeave);
      this.apply();
    });
    window.addEventListener(OPEN_INVENTION_EVENT, this.onOpenRequest);
  }

  private onEnter = (e: MapMouseEvent & { features?: Feature[] }) => {
    this.map.getCanvas().style.cursor = 'pointer';
    this.fan.enter(this.pile, (e.features?.[0]?.properties as Props | undefined)?.id);
  };

  /** Masque dans les calques les inventions déployées dans l'éventail. */
  private hide(ids: string[]) {
    const out = ['!', ['in', ['get', 'id'], ['literal', ids]]];
    if (this.map.getLayer('inventions-glow')) this.map.setFilter('inventions-glow', ['all', ['==', ['get', 'fresh'], true], out] as never);
    if (this.map.getLayer('inventions-icons')) this.map.setFilter('inventions-icons', out as never);
  }
  private onLeave = () => {
    this.map.getCanvas().style.cursor = '';
  };

  private find(id: string): Invention | undefined {
    return (INVENTIONS[this.empire] ?? []).find((i) => i.id === id);
  }

  private onClick = (e: MapMouseEvent & { features?: Feature[] }) => {
    const inv = this.find((e.features?.[0]?.properties as Props | undefined)?.id ?? '');
    // Pile (tactile, sans survol) : le premier toucher ouvre l'éventail.
    if (inv && this.fan.click(this.pile, inv.id)) return;
    if (inv) this.openCard(inv, e.originalEvent.clientX, e.originalEvent.clientY, inv.id === this.previewId ? this.previewNote(inv) : undefined);
  };

  private openCard(inv: Invention, x: number, y: number, note?: string) {
    const p = (cls: string, text: string) => {
      const el = document.createElement('p');
      el.className = cls;
      el.textContent = text;
      return el;
    };
    const parts: Node[] = [
      p('map-card__title', `💡 ${inv.name}`),
      p('map-card__meta', `${CATEGORY_LABELS[inv.category]} · ${inv.approx ? 'vers ' : ''}${formatYear(inv.year)} · ${inv.place}${inv.inventor ? ` · ${inv.inventor}` : ''}`),
    ];
    if (note) parts.push(p('map-card__preview', note));
    parts.push(p('map-card__text', inv.description), p('map-card__impact', `Pourquoi c'est révolutionnaire : ${inv.impact}`));
    for (const s of inv.sources) {
      const a = document.createElement('a');
      a.className = 'map-card__link';
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = `${s.label} ↗`;
      parts.push(a);
    }
    // Comme pour les catastrophes : l'aperçu reste jusqu'au changement d'étape, même si la fiche se ferme.
    openMapCard(this.map, x, y, inv.name, parts);
  }

  /** Clic sur la frise / le panneau / la galerie : cadrer l'invention et ouvrir sa fiche. */
  private onOpenRequest = (e: Event) => {
    const inv = this.find((e as CustomEvent<string>).detail);
    if (!inv) return;
    const early = inv.year > this.year;
    // Un nouvel aperçu remplace le précédent.
    this.previewId = early ? inv.id : null;
    this.apply();
    this.map.flyTo({ center: inv.at, zoom: Math.max(this.map.getZoom(), 5), duration: prefersReducedMotion() ? 0 : 1400, essential: false });
    this.map.once('moveend', () => {
      const pt = this.map.project(inv.at);
      const r = this.map.getContainer().getBoundingClientRect();
      this.openCard(inv, r.left + pt.x, r.top + pt.y - 16, early ? this.previewNote(inv) : undefined);
    });
  };

  private previewNote(inv: Invention): string {
    return `Aperçu : cette invention apparaît en ${formatYear(inv.year)}, après la date de l'étape.`;
  }

  private apply() {
    const src = this.map.getSource(SRC) as GeoJSONSource | undefined;
    if (!src) return;
    const list = this.enabled ? (INVENTIONS[this.empire] ?? []).filter((i) => i.year <= this.year || i.id === this.previewId) : [];
    const fc: FeatureCollection<Point, Props> = {
      type: 'FeatureCollection',
      features: list.map((i) => ({
        type: 'Feature',
        properties: { id: i.id, category: i.category, name: i.name, fresh: (i.year > this.prev && i.year <= this.year) || i.id === this.previewId },
        geometry: { type: 'Point', coordinates: i.at },
      })),
    };
    src.setData(fc);
    this.fan.refreshWhenIdle();
  }

  /** Empire et année de l'étape ; `prev` = année de l'étape précédente (inventions « nouvelles »). */
  setStep(empire: string, year: number, prev: number) {
    this.fan.close();
    if (this.previewId && year !== this.year) {
      this.previewId = null;
      closeMapCard();
    }
    this.empire = empire;
    this.year = year;
    this.prev = prev;
    void this.ready.then(() => {
      this.apply();
      const id = takeInventionOpen();
      // Après le vol de caméra vers l'étape, qui serait sinon prioritaire.
      if (id) window.setTimeout(() => window.dispatchEvent(new CustomEvent(OPEN_INVENTION_EVENT, { detail: id })), 400);
    });
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) this.previewId = null;
    this.fan.close();
    void this.ready.then(() => {
      for (const id of IDS) if (this.map.getLayer(id)) this.map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
      this.apply();
    });
  }

  destroy() {
    window.removeEventListener(OPEN_INVENTION_EVENT, this.onOpenRequest);
    this.fan.unregister(this.pile);
    const m = this.map;
    m.off('click', 'inventions-icons', this.onClick);
    m.off('mouseenter', 'inventions-icons', this.onEnter);
    m.off('mouseleave', 'inventions-icons', this.onLeave);
    if (!m.getStyle()) return;
    for (const id of [...IDS].reverse()) if (m.getLayer(id)) m.removeLayer(id);
    if (m.getSource(SRC)) m.removeSource(SRC);
  }
}
