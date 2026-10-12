import { Map as MapLibreMap, type PaddingOptions } from 'maplibre-gl';
import './maplibreWorker';
import { useEffect, useRef, useState } from 'react';
import { loadCities } from '../data/loadCities';
import { loadDiff, loadMorph, loadTerritory, preloadAround, type DiffCollection, type MorphCollection, type TerritoryCollection } from '../data/loadEmpire';
import { prefersReducedMotion } from '../lib/motion';
import type { City, Empire } from '../types';
import { addLand, baseStyle, DEM_SOURCE, MAX_BOUNDS, TERRAIN_EXAGGERATION } from './basemapStyle';
import { ArmyLayer } from './armyLayer';
import { CityLayer } from './cityLayer';
import { DiffHighlight } from './diff';
import { EventMarker } from './eventMarker';
import { FigureLayer } from './figureLayer';
import { MORPH_MS, MorphLayer } from './morphLayer';
import { TerritoryLayers } from './territoryLayers';

interface Props {
  empire: Empire;
  index: number;
  /** Le panneau latéral occupe-t-il une partie de la carte ? (cadrage du flyTo) */
  panelOpen: boolean;
  /** Vue inclinée (true) ou vue 2D à plat (false). */
  tilted: boolean;
  /** Relief 3D (effectif seulement en vue inclinée). */
  relief: boolean;
  /** Vitesse de lecture (la durée du morph s'y adapte). */
  speed?: number;
  /** Figurines : armées en marche et personnages d'époque. */
  figures?: boolean;
}

interface MapLayers {
  territories: TerritoryLayers;
  morph: MorphLayer;
  diff: DiffHighlight;
  marker: EventMarker;
  armies: ArmyLayer;
  figures: FigureLayer;
}

export const TILT_PITCH = 50;
const MAX_PITCH = 70;
const INITIAL_VIEW = { center: [16, 38] as [number, number], zoom: 3 };

function viewPadding(panelOpen: boolean): PaddingOptions {
  const mobile = window.innerWidth < 768;
  if (mobile) return { top: 70, left: 10, right: 10, bottom: panelOpen ? window.innerHeight * 0.45 : 150 };
  return { top: 80, left: 20, right: panelOpen ? 420 : 20, bottom: 150 };
}

export function WorldMap({ empire, index, panelOpen, tilted, relief, speed = 1, figures: figuresOn = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [layers, setLayers] = useState<MapLayers | null>(null);
  const [cityLayer, setCityLayer] = useState<CityLayer | null>(null);
  const shownRef = useRef<string | null>(null);
  const lastIndexRef = useRef<number | null>(null);
  const cameraKeyRef = useRef('');
  const panelOpenRef = useRef(panelOpen);
  panelOpenRef.current = panelOpen;
  const tiltedRef = useRef(tilted);
  tiltedRef.current = tilted;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const morphingRef = useRef(false);

  // Création de la carte (une seule fois).
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: baseStyle(),
      ...INITIAL_VIEW,
      pitch: tiltedRef.current ? TILT_PITCH : 0,
      maxPitch: tiltedRef.current ? MAX_PITCH : 0,
      minZoom: 2.5,
      maxZoom: 9,
      maxBounds: MAX_BOUNDS,
      attributionControl: false,
      renderWorldCopies: false,
      fadeDuration: 0,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      maxTileCacheSize: 200,
    });
    mapRef.current = map;
    if (import.meta.env.DEV) (window as unknown as { __map: MapLibreMap }).__map = map;
    let created: MapLayers | null = null;
    map.on('load', () => {
      created = {
        territories: new TerritoryLayers(map),
        morph: new MorphLayer(map),
        diff: new DiffHighlight(map),
        marker: new EventMarker(map),
        armies: new ArmyLayer(map),
        figures: new FigureLayer(map, () => {
          const mobile = window.innerWidth < 768;
          return { left: 0, top: 70, right: panelOpenRef.current && !mobile ? 420 : 0 };
        }),
      };
      setLayers(created);
      void addLand(map);
    });
    return () => {
      created?.territories.destroy();
      created?.morph.destroy();
      created?.diff.destroy();
      created?.marker.destroy();
      created?.armies.destroy();
      created?.figures.destroy();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Villes : fichier optionnel, chargé à la demande (tableau vide s'il n'existe pas).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layers) return;
    let cancelled = false;
    let created: CityLayer | null = null;
    void loadCities().then((list: City[]) => {
      if (cancelled || list.length === 0 || !map.getStyle()) return;
      created = new CityLayer(map, list, empire);
      setCityLayer(created);
    });
    return () => {
      cancelled = true;
      created?.destroy();
      setCityLayer(null);
    };
  }, [layers, empire]);

  // Inclinaison : pitch cible, avec maxPitch borné en vue 2D.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const reduced = prefersReducedMotion();
    if (tilted) {
      map.setMaxPitch(MAX_PITCH);
      map.easeTo({ pitch: TILT_PITCH, duration: reduced ? 0 : 700 });
    } else {
      map.once('moveend', () => {
        if (!tiltedRef.current) map.setMaxPitch(0);
      });
      map.easeTo({ pitch: 0, bearing: 0, duration: reduced ? 0 : 700 });
    }
  }, [tilted]);

  // Relief 3D : uniquement incliné et activé ; sinon carte plate (hillshade seul).
  const terrainOn = tilted && relief;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layers) return;
    if (terrainOn) map.setTerrain({ source: DEM_SOURCE, exaggeration: TERRAIN_EXAGGERATION });
    else map.setTerrain(null);
  }, [layers, terrainOn]);

  const step = empire.steps[index];

  // Réaction au changement d'étape : territoire, diff, marqueur, caméra.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layers || !step) return;
    let stale = false;

    layers.marker.show(step);
    if (step.location) {
      const camera = {
        center: step.location,
        zoom: Math.min(9, Math.max(2.5, step.zoom ?? 4)),
        pitch: tiltedRef.current ? TILT_PITCH : 0,
        padding: viewPadding(panelOpenRef.current),
      };
      const key = `${camera.center.join(',')}|${camera.zoom}|${camera.pitch}|${camera.padding.right}|${camera.padding.bottom}`;
      // Même cible déjà en cours de vol : on ne relance pas l'animation.
      if (!(key === cameraKeyRef.current && map.isMoving())) {
        cameraKeyRef.current = key;
        if (prefersReducedMotion()) map.jumpTo(camera);
        else map.flyTo({ ...camera, duration: 2000, curve: 1.3, essential: false });
      }
    }

    const key = `${empire.id}/${step.territory}`;
    // Diff / morph : seulement en arrivant de l'étape précédente (avance) ou suivante (retour).
    const prevIndex = lastIndexRef.current;
    lastIndexRef.current = index;
    const forward = prevIndex === index - 1;
    const backward = prevIndex === index + 1 && index + 1 < empire.steps.length;
    const reduced = prefersReducedMotion();
    const morphStep = forward ? step : backward ? empire.steps[index + 1] : undefined;
    const morphPromise: Promise<MorphCollection | null> =
      morphStep && !reduced ? loadMorph(empire.id, morphStep.id) : Promise.resolve(null);
    const diffPromise: Promise<DiffCollection | null> = forward ? loadDiff(empire.id, step.id) : Promise.resolve(null);
    Promise.all([loadTerritory(empire.id, step.territory), diffPromise, morphPromise]).then(([fc, diff, morph]) => {
      if (stale) return;
      if (shownRef.current === key) return; // même territoire : rien à animer
      shownRef.current = key;
      layers.morph.hide();
      if (morph) {
        // Frontière qui glisse ; bascule instantanée sur le territoire final à la fin.
        layers.diff.stop();
        layers.territories.prepare(fc, empire.color);
        layers.territories.suspend();
        morphingRef.current = true;
        layers.morph.play(morph, empire.color, forward ? 0 : 1, MORPH_MS / Math.max(1, speedRef.current), () => {
          morphingRef.current = false;
          layers.territories.commit(true);
          layers.morph.hide();
        });
        return;
      }
      layers.territories.show(fc, empire.color);
      if (diff) layers.diff.flash(diff);
      else layers.diff.stop();
    });
    preloadAround(empire, index);

    return () => {
      stale = true;
      if (morphingRef.current) {
        // Animation interrompue : on l'annule ; l'étape suivante (re)posera son territoire.
        morphingRef.current = false;
        layers.morph.hide();
        shownRef.current = null;
        layers.territories.commit(true);
      }
    };
  }, [layers, empire, index, step]);

  // Figurines : armées et personnages de l'étape, lancés avec la caméra (le flyTo dure 2 s).
  useEffect(() => {
    if (!layers || !step) return;
    layers.armies.clear();
    layers.figures.clear();
    if (figuresOn) {
      const reduced = prefersReducedMotion();
      layers.armies.start(step, speedRef.current, reduced);
      layers.figures.show(step, speedRef.current, reduced);
    }
    return () => {
      layers.armies.clear();
      layers.figures.clear();
    };
  }, [layers, step, figuresOn]);

  // Villes : setData uniquement au changement d'étape (ou à l'arrivée des données).
  const year = step?.year;
  useEffect(() => {
    if (cityLayer && year !== undefined) cityLayer.show(year);
  }, [cityLayer, year]);

  return <div ref={containerRef} className="world-map" role="region" aria-label="Carte du territoire de l'empire" />;
}
