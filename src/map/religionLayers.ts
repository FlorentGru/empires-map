// Calque « Religions » (issue #81), chargé à la demande depuis WorldMap / WorldYearMap : rien dans le JS initial.
// Trois sources : polygones historiques de l'instantané (fond), entités des empires de la vue, pays actuels.
import type { Feature, FeatureCollection } from 'geojson';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import { loadReligionCountries, loadReligionSnapshot } from '../data/loadReligions';
import { presentReligions, setPresentReligions } from '../lib/religions';
import { RELIGION_IDS, RELIGIONS } from '../types-religion';

const COLOR = ['match', ['get', 'religion'], ...RELIGION_IDS.flatMap((r) => [r, RELIGIONS[r].color]), 'rgba(0,0,0,0)'] as never;
const EMPTY = { type: 'FeatureCollection', features: [] } as const;
const SRC = { bg: 'religion-bg', ent: 'religion-entities', ctr: 'religion-countries' } as const;
// Remplissages des empires contemporains (couleur propre) : masqués sous le calque, sinon ils cachent les religions du fond.
const HIDDEN_FILLS = ['contemporaries-fill-core', 'contemporaries-fill-vassal'];
const FILLS = ['religion-bg-fill', 'religion-bg-line', 'religion-entities-fill', 'religion-countries-fill', 'religion-countries-line'];

interface Options {
  /** Les polygones historiques se glissent sous ce calque (le plus bas des calques d'empire). */
  bgBefore?: string;
  /** Entités et pays se glissent sous ce calque, au-dessus des remplissages des territoires. */
  entityBefore?: string;
  /** Traits et étiquettes des territoires, remontés au-dessus de nos remplissages pour garder les frontières lisibles. */
  raise?: string[];
}

export class ReligionLayers {
  private enabled = false;
  private countries = false;
  private snapshot: string | null = null;
  private bg: Feature[] = [];
  private ctr: Feature[] | null = null;
  private ents = new Map<string, Feature[]>();
  private token = 0;
  private filters = new Map<string, unknown>();

  constructor(
    private map: MapLibreMap,
    { bgBefore, entityBefore, raise = [] }: Options = {},
  ) {
    for (const s of Object.values(SRC)) map.addSource(s, { type: 'geojson', data: EMPTY as never });
    const fill = (id: string, source: string, opacity: number, before?: string) =>
      map.addLayer({ id, type: 'fill', source, layout: { visibility: 'none' }, paint: { 'fill-color': COLOR, 'fill-opacity': opacity } }, before);
    const line = (id: string, source: string, before?: string) =>
      map.addLayer(
        { id, type: 'line', source, layout: { visibility: 'none' }, paint: { 'line-color': '#fff8e6', 'line-width': 0.8, 'line-opacity': 0.55 } },
        before,
      );
    fill('religion-bg-fill', SRC.bg, 0.7, bgBefore);
    line('religion-bg-line', SRC.bg, bgBefore);
    // Presque opaque : la couleur de la religion ne doit pas se mêler à celle de l'empire en dessous (frontières remontées au-dessus).
    fill('religion-entities-fill', SRC.ent, 0.85, entityBefore);
    fill('religion-countries-fill', SRC.ctr, 0.7, entityBefore);
    line('religion-countries-line', SRC.ctr, entityBefore);
    for (const id of raise) if (map.getLayer(id)) map.moveLayer(id, entityBefore);
    for (const id of HIDDEN_FILLS) if (map.getLayer(id)) this.filters.set(id, map.getFilter(id));
  }

  private set(src: string, features: Feature[]) {
    if (this.map.getStyle()) (this.map.getSource(src) as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features } as never);
  }

  private apply() {
    const m = this.map;
    if (!m.getStyle()) return;
    const vis = (on: boolean) => (on ? 'visible' : 'none');
    for (const id of FILLS) {
      if (!m.getLayer(id)) continue;
      const own = id.includes('countries') ? this.countries : !this.countries;
      m.setLayoutProperty(id, 'visibility', vis(this.enabled && own));
    }
    // Un filtre toujours faux plutôt que la visibilité ou l'opacité, que contemporaryLayers pilote déjà.
    for (const [id, filter] of this.filters) if (m.getLayer(id)) m.setFilter(id, (this.enabled ? ['boolean', false] : filter) as never);
    if (this.enabled && this.countries && !this.ctr) {
      this.ctr = [];
      void loadReligionCountries().then((fc) => {
        this.ctr = fc.features;
        this.set(SRC.ctr, this.ctr);
        this.publish();
      });
    }
    this.publish();
  }

  private publish() {
    if (!this.enabled) return setPresentReligions([]);
    setPresentReligions(presentReligions(this.countries ? [this.ctr ?? []] : [this.bg, ...this.ents.values()]));
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.apply();
  }

  /** « Pays 2026 » actif : religions des pays actuels à la place des religions historiques. */
  setCountries(on: boolean) {
    this.countries = on;
    this.apply();
  }

  /** Instantané de fond (null : aucun). */
  setSnapshot(name: string | null) {
    if (name === this.snapshot) return;
    this.snapshot = name;
    const token = ++this.token;
    if (!name) {
      this.bg = [];
      this.set(SRC.bg, this.bg);
      return this.publish();
    }
    void loadReligionSnapshot(name).then((fc: FeatureCollection) => {
      if (token !== this.token) return;
      this.bg = fc.features;
      this.set(SRC.bg, this.bg);
      this.publish();
    });
  }

  /** Entités d'un empire (clé = empire) avec leur propriété `religion` ; null les retire. */
  setEntities(key: string, features: Feature[] | null) {
    if (features) this.ents.set(key, features);
    else if (!this.ents.delete(key)) return;
    this.set(SRC.ent, [...this.ents.values()].flat());
    this.publish();
  }

  destroy() {
    setPresentReligions([]);
  }
}
