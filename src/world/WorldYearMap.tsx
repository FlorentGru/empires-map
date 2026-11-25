import { Map as MapLibreMap, type MapMouseEvent } from 'maplibre-gl';
import '../map/maplibreWorker';
import { useEffect, useRef, useState } from 'react';
import { loadCities } from '../data/loadCities';
import { loadReligionSnapshots, loadStepReligions } from '../data/loadReligions';
import { pickSnapshot, withReligions } from '../lib/religions';
import type { ReligionLayers } from '../map/religionLayers';
import { EMPIRES, loadTerritory } from '../data/loadEmpire';
import { empiresAt } from '../lib/worldYear';
import { formatYear } from '../lib/years';
import { addLand, baseStyle, fetchLand } from '../map/basemapStyle';
import { CityLayer } from '../map/cityLayer';
import { GOTO_EVENT, type GotoDetail } from '../map/contemporaryLayers';
import { DisasterLayers } from '../map/disasterLayers';
import { closeMapCard, openMapCard } from '../map/mapCard';
import { MonumentLayers } from '../map/monumentLayers';
import { RouteLayers } from '../map/routeLayers';
import { fillLayerId, WorldEmpireLayers } from './worldEmpireLayers';

interface Layers {
  empires: WorldEmpireLayers;
  monuments: MonumentLayers;
  routes: RouteLayers;
  disasters: DisasterLayers;
}

const UPDATE_DELAY_MS = 60;

/** Carte du monde entier à l'année donnée : territoires de tous les empires présents + calques d'époque. */
export function WorldYearMap({ year, religions = false }: { year: number; religions?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [layers, setLayers] = useState<Layers | null>(null);
  const [cities, setCities] = useState<CityLayer | null>(null);
  /** Clé « empire/territoire » voulue puis chargée, par empire : évite les rechargements inutiles. */
  const wanted = useRef(new Map<string, string | null>());
  const loaded = useRef(new Map<string, string>());
  const yearRef = useRef(year);
  yearRef.current = year;

  useEffect(() => {
    if (!containerRef.current) return;
    wanted.current.clear();
    loaded.current.clear();
    const map = new MapLibreMap({
      container: containerRef.current,
      style: baseStyle(),
      center: [40, 30],
      zoom: 1.8,
      minZoom: 1,
      maxZoom: 9,
      attributionControl: false,
      renderWorldCopies: false,
      fadeDuration: 0,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      maxTileCacheSize: 200,
    });
    mapRef.current = map;
    if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('e2e')) (window as unknown as { __map: MapLibreMap }).__map = map;
    let created: Layers | null = null;
    let cityLayer: CityLayer | null = null;
    let gone = false;
    void fetchLand().catch(() => {});
    // Comme l'Atlas : sans attendre les tuiles de relief.
    map.once('style.load', () => {
      created = {
        empires: new WorldEmpireLayers(map, EMPIRES),
        routes: new RouteLayers(map),
        disasters: new DisasterLayers(map),
        monuments: new MonumentLayers(map),
      };
      setLayers(created);
      void addLand(map);
      void loadCities().then((list) => {
        if (gone || !list.length || !map.getStyle()) return;
        cityLayer = new CityLayer(map, list, EMPIRES[0]!);
        setCities(cityLayer);
      });
    });

    // Clic : le territoire le plus haut sous le pointeur (sauf si un monument, une route ou une catastrophe est visé).
    const onClick = (e: MapMouseEvent) => {
      if (!created) return;
      const own = map
        .getStyle()
        .layers.map((l) => l.id)
        .filter((id) => /^(monuments|route|disaster)/.test(id));
      if (own.length && map.queryRenderedFeatures(e.point, { layers: own }).length) return;
      const hit = map.queryRenderedFeatures(e.point, { layers: created.empires.layerIds() })[0];
      if (!hit) {
        closeMapCard();
        return;
      }
      const empireId = hit.layer.id.replace(/^world-/, '').replace(/-fill$/, '');
      const present = empiresAt(yearRef.current).find((p) => p.empire.id === empireId);
      if (!present) return;
      const { empire, step } = present;
      const title = document.createElement('p');
      title.className = 'map-card__title';
      title.textContent = `${String(hit.properties?.name ?? empire.name)} · ${empire.name} — ${step.title} (${formatYear(step.year)})`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'map-card__go';
      btn.textContent = 'Voir dans cet empire →';
      btn.addEventListener('click', () => {
        closeMapCard();
        window.dispatchEvent(new CustomEvent<GotoDetail>(GOTO_EVENT, { detail: { empire: empire.id, step: step.id } }));
      });
      openMapCard(map, e.originalEvent.clientX, e.originalEvent.clientY, `${empire.name} — ${step.title}`, [title, btn], btn);
    };
    map.on('click', onClick);

    return () => {
      gone = true;
      closeMapCard();
      created?.empires.destroy();
      created?.monuments.destroy();
      created?.routes.destroy();
      created?.disasters.destroy();
      cityLayer?.destroy();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Mises à jour de la carte pour l'année (légèrement différées : le curseur peut aller vite).
  useEffect(() => {
    if (!layers) return;
    const t = setTimeout(() => {
      layers.monuments.setYear(year);
      layers.routes.setYear(year);
      layers.disasters.setYear(year);
      cities?.show(year);
      const present = new Map(empiresAt(year).map((p) => [p.empire.id, p]));
      for (const e of EMPIRES) {
        const p = present.get(e.id);
        if (!p) {
          wanted.current.set(e.id, null);
          loaded.current.delete(e.id);
          layers.empires.hide(e.id);
          continue;
        }
        const key = `${e.id}/${p.step.territory}`;
        wanted.current.set(e.id, key);
        if (loaded.current.get(e.id) === key) continue;
        void loadTerritory(e.id, p.step.territory).then((fc) => {
          if (wanted.current.get(e.id) !== key || !mapRef.current?.getStyle()) return;
          loaded.current.set(e.id, key);
          layers.empires.show(e.id, fc);
        });
      }
    }, UPDATE_DELAY_MS);
    return () => clearTimeout(t);
  }, [layers, cities, year]);

  // Calque « Religions » : module chargé au premier affichage ; fond de l'instantané le plus proche + entités des empires présents.
  const religionRef = useRef<Promise<ReligionLayers | null> | null>(null);
  const withReligion = (fn: (r: ReligionLayers) => void) => void religionRef.current?.then((r) => r && fn(r));
  useEffect(() => {
    const map = mapRef.current;
    if (!layers || !map) return;
    if (religions && !religionRef.current) {
      religionRef.current = import('../map/religionLayers').then(({ ReligionLayers }) => {
        if (mapRef.current !== map || !map.getStyle()) return null;
        // Au-dessus de tous les remplissages d'empire, sous leurs traits et étiquettes (remontés) et sous routes, catastrophes, monuments.
        const ids = map.getStyle().layers.map((l) => l.id);
        const world = ids.filter((id) => id.startsWith('world-'));
        return new ReligionLayers(map, {
          bgBefore: fillLayerId(EMPIRES[0]!.id),
          entityBefore: ids[ids.lastIndexOf(world[world.length - 1]!) + 1],
          raise: world.filter((id) => !id.endsWith('-fill')),
        });
      });
    }
    withReligion((r) => r.setEnabled(religions));
  }, [layers, religions]);
  useEffect(() => {
    if (!layers || !religions) return;
    let stale = false;
    const t = setTimeout(() => {
      void loadReligionSnapshots().then((names) => !stale && withReligion((r) => r.setSnapshot(pickSnapshot(year, names))));
      const present = new Map(empiresAt(year).map((p) => [p.empire.id, p]));
      for (const e of EMPIRES) {
        const p = present.get(e.id);
        if (!p) {
          withReligion((r) => r.setEntities(e.id, null));
          continue;
        }
        void Promise.all([loadStepReligions(e.id, p.step.id), loadTerritory(e.id, p.step.territory)]).then(([sr, fc]) => {
          if (!stale) withReligion((r) => r.setEntities(e.id, withReligions(fc.features, sr?.entities)));
        });
      }
    }, UPDATE_DELAY_MS);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [layers, year, religions]);

  return <div ref={containerRef} className="world-map" role="region" aria-label="Carte du monde à l'année choisie" />;
}
