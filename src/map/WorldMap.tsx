import { Map as MapLibreMap, type PaddingOptions } from 'maplibre-gl';
import './maplibreWorker';
import { useEffect, useRef, useState } from 'react';
import { loadTerritory, preloadAround, type TerritoryCollection } from '../data/loadEmpire';
import { prefersReducedMotion } from '../lib/motion';
import type { Empire } from '../types';
import { addLand, baseStyle } from './basemapStyle';
import { computeDiff, DiffHighlight } from './diff';
import { EventMarker } from './eventMarker';
import { TerritoryLayers } from './territoryLayers';

interface Props {
  empire: Empire;
  index: number;
  /** Le panneau latéral occupe-t-il une partie de la carte ? (cadrage du flyTo) */
  panelOpen: boolean;
}

interface MapLayers {
  territories: TerritoryLayers;
  diff: DiffHighlight;
  marker: EventMarker;
}

const INITIAL_VIEW = { center: [16, 38] as [number, number], zoom: 3 };

function viewPadding(panelOpen: boolean): PaddingOptions {
  const mobile = window.innerWidth < 768;
  if (mobile) return { top: 70, left: 10, right: 10, bottom: panelOpen ? window.innerHeight * 0.45 : 150 };
  return { top: 80, left: 20, right: panelOpen ? 420 : 20, bottom: 150 };
}

export function WorldMap({ empire, index, panelOpen }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [layers, setLayers] = useState<MapLayers | null>(null);
  const shownRef = useRef<{ key: string; fc: TerritoryCollection } | null>(null);
  const panelOpenRef = useRef(panelOpen);
  panelOpenRef.current = panelOpen;

  // Création de la carte (une seule fois).
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: baseStyle(),
      ...INITIAL_VIEW,
      attributionControl: false,
      renderWorldCopies: false,
      maxPitch: 0,
    });
    mapRef.current = map;
    if (import.meta.env.DEV) (window as unknown as { __map: MapLibreMap }).__map = map;
    let created: MapLayers | null = null;
    map.on('load', () => {
      created = {
        territories: new TerritoryLayers(map),
        diff: new DiffHighlight(map),
        marker: new EventMarker(map),
      };
      setLayers(created);
      void addLand(map);
    });
    return () => {
      created?.territories.destroy();
      created?.diff.destroy();
      created?.marker.destroy();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const step = empire.steps[index];

  // Réaction au changement d'étape : territoire, diff, marqueur, caméra.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layers || !step) return;
    let stale = false;

    layers.marker.show(step);
    if (step.location) {
      const camera = { center: step.location, zoom: step.zoom ?? 4, padding: viewPadding(panelOpenRef.current) };
      if (prefersReducedMotion()) map.jumpTo(camera);
      else map.flyTo({ ...camera, duration: 2000, curve: 1.3, essential: false });
    }

    const key = `${empire.id}/${step.territory}`;
    loadTerritory(empire.id, step.territory).then((fc) => {
      if (stale) return;
      const prev = shownRef.current;
      if (prev?.key === key) return; // même territoire : rien à animer
      layers.territories.show(fc, empire.color);
      layers.diff.flash(prev && prev.key.startsWith(`${empire.id}/`) ? computeDiff(prev.fc, fc) : computeDiff(null, fc));
      shownRef.current = { key, fc };
    });
    preloadAround(empire, index);

    return () => {
      stale = true;
    };
  }, [layers, empire, index, step]);

  return <div ref={containerRef} className="world-map" role="region" aria-label="Carte du territoire de l'empire" />;
}
