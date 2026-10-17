import { LngLatBounds, Map as MapLibreMap, type PaddingOptions } from 'maplibre-gl';
import './maplibreWorker';
import { useEffect, useRef, useState } from 'react';
import { loadCities } from '../data/loadCities';
import { loadContemporaries, loadDiff, loadMorph, loadNeighbors, loadTerritory, preloadAround, type ContemporaryCollection, type DiffCollection, type MorphCollection, type NeighborCollection, type TerritoryCollection } from '../data/loadEmpire';
import { prefersReducedMotion } from '../lib/motion';
import type { City, Empire, TimelineStep } from '../types';
import { addLand, baseStyle, DEM_SOURCE, MAX_BOUNDS, TERRAIN_EXAGGERATION } from './basemapStyle';
import { takeFocusPoint, FOCUS_ENTITY_EVENT, geometryBounds, type FocusEntityDetail } from './focusEntity';
import { ArmyLayer, continuedArmies } from './armyLayer';
import { LONG_MARCH_KM, longestMarchKm, marchMs } from '../lib/march';
import { CityLayer } from './cityLayer';
import { CountriesLayer } from './countriesLayer';
import { DiffHighlight } from './diff';
import { EventMarker } from './eventMarker';
import { FigureLayer } from './figureLayer';
import { GLIDE_HANDOFF_MS, GLIDE_MS, GlideLayer } from './glideLayer';
import { MORPH_MS, MorphLayer } from './morphLayer';
import { NeighborLayers } from './neighborLayers';
import { ContemporaryLayers } from './contemporaryLayers';
import { MonumentLayers } from './monumentLayers';
import { RouteLayers } from './routeLayers';
import { DisasterLayers } from './disasterLayers';
import { InventionLayers } from './inventionLayers';
import { originName } from '../lib/origin';
import { dropCoveredLabels } from '../lib/contemporaries';
import { TerritoryLabels } from './territoryLabels';
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
  /** Calque « Pays 2026 » : frontières et noms actuels. */
  countries2026?: boolean;
  /** Noms des États sur la carte. */
  stateNames?: boolean;
  /** Voisins de l'époque (contours et noms). */
  neighbors?: boolean;
  contemporaries?: boolean;
  /** Grands monuments debout à la date de l'étape. */
  monuments?: boolean;
  /** Routes commerciales actives à la date de l'étape. */
  routes?: boolean;
  /** Épidémies, catastrophes et guerres meurtrières en cours. */
  disasters?: boolean;
  /** Inventions révolutionnaires de l'empire déjà apparues. */
  inventions?: boolean;
  /** Carte d'un panneau de comparaison : marges réduites, sans panneaux par-dessus. */
  compact?: boolean;
}

interface MapLayers {
  neighbors: NeighborLayers;
  contemporaries: ContemporaryLayers;
  monuments: MonumentLayers;
  routes: RouteLayers;
  disasters: DisasterLayers;
  inventions: InventionLayers;
  territories: TerritoryLayers;
  labels: TerritoryLabels;
  morph: MorphLayer;
  glide: GlideLayer;
  diff: DiffHighlight;
  marker: EventMarker;
  armies: ArmyLayer;
  figures: FigureLayer;
  countries: CountriesLayer;
}

export const TILT_PITCH = 50;
const MAX_PITCH = 70;
const INITIAL_VIEW = { center: [16, 38] as [number, number], zoom: 3 };
/** Dernière vue de caméra : la carte recréée au changement d'empire repart de là, puis vole vers la nouvelle vue. */
let lastView: { empireId: string; center: [number, number]; zoom: number } | null = null;

/** Carte compacte (vue de comparaison) : pas de panneaux par-dessus, marges réduites. */
let compactMaps = 0;

function viewPadding(panelOpen: boolean, compact = compactMaps > 0): PaddingOptions {
  if (compact) return { top: 16, left: 16, right: 16, bottom: 16 };
  const mobile = window.innerWidth < 768;
  if (mobile) return { top: 70, left: 10, right: 10, bottom: panelOpen ? window.innerHeight * 0.45 : 150 };
  // La légende ouverte (en bas à gauche) masque une bande de carte : on l'exclut du cadrage.
  const legend = document.querySelector<HTMLElement>('.legend');
  const legendOpen = legend?.querySelector('[aria-expanded="true"]');
  const left = legend && legendOpen ? Math.round(legend.getBoundingClientRect().right) + 16 : 20;
  return { top: 80, left, right: panelOpen ? 420 : 20, bottom: 150 };
}

/** Durée du vol de caméra vers une étape (ms) : raccourci aux vitesses rapides pour que vol + glissement tiennent dans l'étape. */
const FLY_MS = 2000;
const flyMs = (speed: number) => FLY_MS / Math.max(1, speed);

/**
 * Attend la fin du vol de caméra en cours : le glissement ne partage pas ses images avec le vol
 * (et, en relief, avec le chargement des tuiles). Plafond : fin prévue du vol, ou 1,4 s (/ vitesse)
 * pour les marches d'armées chaînées dont la caméra rebondit pendant le glissement.
 */
function cameraGate(map: MapLibreMap, stepStart: number, speed: number, chained: boolean): Promise<void> {
  const limit = chained ? 1400 / Math.max(1, speed) : flyMs(speed) + 100;
  const wait = limit - (performance.now() - stepStart);
  if (!map.isMoving() || wait <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      window.clearTimeout(timer);
      map.off('moveend', done);
      resolve();
    };
    const timer = window.setTimeout(done, wait);
    map.on('moveend', done);
  });
}

export function WorldMap({ empire, index, panelOpen, tilted, relief, speed = 1, figures: figuresOn = true, countries2026 = false, stateNames = true, neighbors: neighborsOn = true, contemporaries: contemporariesOn = true, monuments: monumentsOn = true, routes: routesOn = true, disasters: disastersOn = true, inventions: inventionsOn = true, compact = false }: Props) {
  // Les cartes compactes ne cohabitent pas avec la vue normale : un compteur global suffit.
  useEffect(() => {
    if (!compact) return;
    compactMaps++;
    return () => {
      compactMaps--;
    };
  }, [compact]);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [layers, setLayers] = useState<MapLayers | null>(null);
  const [cityLayer, setCityLayer] = useState<CityLayer | null>(null);
  const shownRef = useRef<string | null>(null);
  const lastIndexRef = useRef<number | null>(null);
  /** Étape n−1 si l'étape courante a été atteinte en avance séquentielle, sinon null. */
  const seqPrevRef = useRef<TimelineStep | null>(null);
  const cameraKeyRef = useRef('');
  const panelOpenRef = useRef(panelOpen);
  panelOpenRef.current = panelOpen;
  const tiltedRef = useRef(tilted);
  tiltedRef.current = tilted;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const morphingRef = useRef(false);
  const countriesRef = useRef(countries2026);
  countriesRef.current = countries2026;
  const namesRef = useRef(stateNames);
  namesRef.current = stateNames;
  const neighborsRef = useRef(neighborsOn);
  neighborsRef.current = neighborsOn;
  const contemporariesRef = useRef(contemporariesOn);
  contemporariesRef.current = contemporariesOn;
  // Villes (noms d'époque) : nomment le point de départ des armées.
  const citiesRef = useRef<City[]>([]);
  useEffect(() => {
    void loadCities().then((c) => (citiesRef.current = c));
  }, []);
  const monumentsRef = useRef(monumentsOn);
  monumentsRef.current = monumentsOn;
  const routesRef = useRef(routesOn);
  routesRef.current = routesOn;
  const disastersRef = useRef(disastersOn);
  disastersRef.current = disastersOn;
  const inventionsRef = useRef(inventionsOn);
  inventionsRef.current = inventionsOn;

  // Création de la carte (une seule fois).
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: baseStyle(),
      ...(lastView && lastView.empireId === empire.id ? lastView : (empire.view ?? INITIAL_VIEW)),
      pitch: tiltedRef.current ? TILT_PITCH : 0,
      maxPitch: tiltedRef.current ? MAX_PITCH : 0,
      minZoom: 2.5,
      maxZoom: 9,
      maxBounds: empire.bounds ?? undefined,
      attributionControl: false,
      renderWorldCopies: false,
      fadeDuration: 0,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      maxTileCacheSize: 200,
    });
    mapRef.current = map;
    // Crochet de test : en dev, ou avec ?e2e dans l'URL (tests Playwright sur le build de production).
    if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('e2e')) (window as unknown as { __map: MapLibreMap }).__map = map;
    let created: MapLayers | null = null;
    map.on('load', () => {
      created = {
        // Voisins : tout en bas des calques d'empire (sous territoires et glissement).
        neighbors: new NeighborLayers(map),
        // Autres empires de l'époque : juste au-dessus des voisins, sous les territoires.
        contemporaries: new ContemporaryLayers(map),
        routes: new RouteLayers(map),
        disasters: new DisasterLayers(map),
        inventions: new InventionLayers(map),
        monuments: new MonumentLayers(map),
        territories: new TerritoryLayers(map),
        morph: new MorphLayer(map),
        // Raster SDF : juste sous les couches territoire.
        glide: new GlideLayer(map, 'territory-a-fill'),
        diff: new DiffHighlight(map),
        marker: new EventMarker(map),
        armies: new ArmyLayer(map),
        figures: new FigureLayer(map, () => {
          const mobile = window.innerWidth < 768;
          // Même zone que le cadrage de la caméra : hors légende ouverte, panneau latéral et frise.
          return {
            left: mobile ? 0 : Math.max(0, (viewPadding(panelOpenRef.current).left ?? 20) - 16),
            top: 70,
            right: panelOpenRef.current && !mobile ? 420 : 0,
            bottom: mobile && panelOpenRef.current ? window.innerHeight * 0.45 : 150,
          };
        }),
        // Après territoires / morph, avant les villes (ajoutées plus tard, donc au-dessus).
        countries: new CountriesLayer(map),
        labels: new TerritoryLabels(map),
      };
      created.labels.setEnabled(namesRef.current);
      created.neighbors.setEnabled(neighborsRef.current);
      created.contemporaries.setEnabled(contemporariesRef.current);
      created.monuments.setEnabled(monumentsRef.current);
      created.routes.setEnabled(routesRef.current);
      created.disasters.setEnabled(disastersRef.current);
      created.inventions.setEnabled(inventionsRef.current);
      created.countries.setVisible(countriesRef.current);
      if (import.meta.env.DEV) (window as unknown as { __glide: GlideLayer }).__glide = created.glide;
      setLayers(created);
      void addLand(map);
    });
    return () => {
      const c = map.getCenter();
      lastView = { empireId: empire.id, center: [c.lng, c.lat], zoom: map.getZoom() };
      created?.territories.destroy();
      created?.morph.destroy();
      created?.glide.destroy();
      created?.diff.destroy();
      created?.marker.destroy();
      created?.armies.destroy();
      created?.figures.destroy();
      created?.countries.destroy();
      created?.labels.destroy();
      created?.neighbors.destroy();
      created?.contemporaries.destroy();
      created?.monuments.destroy();
      created?.routes.destroy();
      created?.disasters.destroy();
      created?.inventions.destroy();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Limites de navigation propres à l'empire (sinon globales).
  useEffect(() => {
    mapRef.current?.setMaxBounds(empire.bounds ?? MAX_BOUNDS);
  }, [empire.id, empire.bounds]);

  // Villes : fichier optionnel, chargé à la demande (tableau vide s'il n'existe pas).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layers) return;
    let cancelled = false;
    let created: CityLayer | null = null;
    void loadCities().then((list: City[]) => {
      if (cancelled || list.length === 0 || !map.getStyle()) return;
      created = new CityLayer(map, list, empire);
      // Les noms d'États passent avant les noms de villes (MapLibre place d'abord les couches du haut).
      if (map.getLayer('territory-labels')) map.moveLayer('territory-labels');
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

  // Clic sur un territoire de la légende : on cadre la carte sur cette entité.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onFocus = (ev: Event) => {
      const { territory, index: entity } = (ev as CustomEvent<FocusEntityDetail>).detail;
      void loadTerritory(empire.id, territory).then((fc) => {
        const g = fc.features[entity]?.geometry;
        if (!g || (g.type !== 'Polygon' && g.type !== 'MultiPolygon')) return;
        const [w, s, e, n] = geometryBounds(g);
        if (!Number.isFinite(w)) return;
        map.fitBounds(
          [
            [w, s],
            [e, n],
          ],
          {
            padding: viewPadding(panelOpenRef.current),
            pitch: tiltedRef.current ? TILT_PITCH : 0,
            maxZoom: 7,
            duration: prefersReducedMotion() ? 0 : 1200,
          },
        );
      });
    };
    window.addEventListener(FOCUS_ENTITY_EVENT, onFocus);
    return () => window.removeEventListener(FOCUS_ENTITY_EVENT, onFocus);
  }, [layers, empire.id]);

  // Réaction au changement d'étape : territoire, diff, marqueur, caméra.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layers || !step) return;
    let stale = false;

    layers.marker.show(step);
    const seqPrev = lastIndexRef.current === index - 1 ? (empire.steps[index - 1] ?? null) : null;
    seqPrevRef.current = seqPrev;
    const chained = seqPrev ? continuedArmies(empire.steps, index) : [];
    const camTimers: number[] = [];
    const longMarch = longestMarchKm(step.armies) > LONG_MARCH_KM;
    if (step.location && (chained.length > 0 || longMarch) && !prefersReducedMotion()) {
      // Campagne : on cadre d'abord toute la marche, puis on rejoint le champ de bataille au choc.
      const bounds = new LngLatBounds();
      for (const a of step.armies ?? []) if (a.path.length >= 2) for (const pt of a.path) bounds.extend(pt);
      const sp = Math.max(0.25, speedRef.current);
      const pitch = tiltedRef.current ? TILT_PITCH : 0;
      const padding = viewPadding(panelOpenRef.current);
      cameraKeyRef.current = '';
      map.fitBounds(bounds, { padding, pitch, maxZoom: 9, duration: 1200 / sp, essential: false });
      const loc = step.location;
      const zoom = Math.min(9, Math.max(2.5, step.zoom ?? 4));
      const lead = 1200 / sp;
      camTimers.push(
        window.setTimeout(
          () => map.flyTo({ center: loc, zoom, pitch, padding, duration: lead, curve: 1.3, essential: false }),
          Math.max(0, marchMs(step.armies) / sp - lead - 100),
        ),
      );
    } else if (step.location) {
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
        else map.flyTo({ ...camera, duration: flyMs(speedRef.current), curve: 1.3, essential: false });
      }
    }

    else if (empire.view) {
      const camera = { center: empire.view.center, zoom: empire.view.zoom, pitch: tiltedRef.current ? TILT_PITCH : 0, padding: viewPadding(panelOpenRef.current) };
      if (prefersReducedMotion()) map.jumpTo(camera);
      else map.flyTo({ ...camera, duration: flyMs(speedRef.current), curve: 1.3, essential: false });
    }

    // « Voir sur la carte » depuis la galerie : on cadre le point demandé plutôt que l'étape.
    const focusPoint = takeFocusPoint();
    if (focusPoint) {
      cameraKeyRef.current = '';
      map.flyTo({ center: focusPoint.at, zoom: focusPoint.zoom, pitch: tiltedRef.current ? TILT_PITCH : 0, padding: viewPadding(panelOpenRef.current), duration: prefersReducedMotion() ? 0 : 1800, essential: false });
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
    const stepStart = performance.now();
    const contemporariesPromise: Promise<ContemporaryCollection> = loadContemporaries(empire.id, step.id);
    // Voisins sans les noms recouverts par un empire contemporain (évite les doubles étiquettes).
    const neighborsPromise: Promise<NeighborCollection> = Promise.all([loadNeighbors(empire.id, step.id), contemporariesPromise]).then(
      ([n, c]) => (contemporariesRef.current ? { ...n, features: dropCoveredLabels(n.features, c.features) } : n),
    );
    /** Territoire final affiché : noms des États et voisins, une seule mise à jour par étape. */
    const reveal = (fc: TerritoryCollection) => {
      layers.labels.update(fc, empire.color);
      void contemporariesPromise.then((c) => {
        if (!stale) layers.contemporaries.update(c);
      });
      void neighborsPromise.then((n) => {
        if (!stale) layers.neighbors.update(n);
      });
    };
    void Promise.all([loadTerritory(empire.id, step.territory), diffPromise, morphPromise]).then(async ([fc, diff, morph]) => {
      if (stale) return;
      if (shownRef.current === key) {
        // même territoire : rien à animer, mais voisins et contemporains sont propres à l'étape
        void contemporariesPromise.then((c) => {
          if (!stale) layers.contemporaries.update(c);
        });
        void neighborsPromise.then((n) => {
          if (!stale) layers.neighbors.update(n);
        });
        return;
      }
      shownRef.current = key;
      layers.morph.hide();
      layers.glide.hide();
      if (morphStep && !reduced) {
        layers.labels.hide();
        // Glissement continu par champs de distance (SDF), si les fichiers existent.
        const from: 0 | 1 = forward ? 0 : 1;
        layers.diff.stop();
        layers.territories.prepare(fc, empire.color);
        morphingRef.current = true;
        const sdfOk = await layers.glide.prepare(empire.id, morphStep.id, empire.color, from);
        if (stale) return;
        if (sdfOk) {
          layers.glide.setMode('sdf');
          await cameraGate(map, stepStart, speedRef.current, chained.length > 0);
          if (stale) return;
          layers.territories.suspend();
          layers.glide.play(from, GLIDE_MS / Math.max(1, speedRef.current), () => {
            morphingRef.current = false;
            layers.territories.commit(false, GLIDE_HANDOFF_MS);
            layers.glide.fadeOut(GLIDE_HANDOFF_MS);
            reveal(fc);
          });
          return;
        }
      }
      if (morph) {
        // Repli : bandes. L'ancien territoire reste affiché le temps du chargement et du vol de caméra,
        // puis le morph prend le relais ; bascule instantanée sur le territoire final à la fin.
        const from: 0 | 1 = forward ? 0 : 1;
        layers.diff.stop();
        layers.territories.prepare(fc, empire.color);
        morphingRef.current = true;
        layers.labels.hide();
        layers.glide.setMode('bandes');
        await layers.morph.prepare(morph, empire.color, from);
        if (stale) return;
        await cameraGate(map, stepStart, speedRef.current, chained.length > 0);
        if (stale) return;
        layers.territories.suspend();
        layers.morph.play(from, MORPH_MS / Math.max(1, speedRef.current), () => {
          morphingRef.current = false;
          layers.territories.commit(true);
          layers.morph.hide();
          reveal(fc);
        });
        return;
      }
      morphingRef.current = false;
      layers.glide.setMode('fondu');
      layers.territories.show(fc, empire.color);
      reveal(fc);
      if (diff) layers.diff.flash(diff);
      else layers.diff.stop();
    });
    preloadAround(empire, index);

    return () => {
      stale = true;
      for (const t of camTimers) window.clearTimeout(t);
      if (morphingRef.current) {
        // Animation interrompue : on l'annule ; l'étape suivante (re)posera son territoire.
        morphingRef.current = false;
        layers.morph.hide();
        layers.glide.hide();
        shownRef.current = null;
        layers.territories.commit(true);
      }
    };
  }, [layers, empire, index, step]);

  useEffect(() => {
    layers?.labels.setEnabled(stateNames);
  }, [layers, stateNames]);

  useEffect(() => {
    layers?.neighbors.setEnabled(neighborsOn);
  }, [layers, neighborsOn]);

  useEffect(() => {
    if (!layers) return;
    layers.contemporaries.setEnabled(contemporariesOn);
    // les étiquettes de voisins dépendent des contemporains affichés : recalcul à la bascule
    const step = empire.steps[index];
    if (!step) return;
    let stale = false;
    void Promise.all([loadNeighbors(empire.id, step.id), loadContemporaries(empire.id, step.id)]).then(([n, c]) => {
      if (!stale) layers.neighbors.update(contemporariesOn ? { ...n, features: dropCoveredLabels(n.features, c.features) } : n);
    });
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, contemporariesOn]);

  // Monuments : réglage d'affichage et année de l'étape.
  useEffect(() => {
    layers?.monuments.setEnabled(monumentsOn);
  }, [layers, monumentsOn]);
  useEffect(() => {
    layers?.routes.setEnabled(routesOn);
  }, [layers, routesOn]);
  useEffect(() => {
    layers?.disasters.setEnabled(disastersOn);
  }, [layers, disastersOn]);
  useEffect(() => {
    layers?.inventions.setEnabled(inventionsOn);
  }, [layers, inventionsOn]);
  useEffect(() => {
    if (!layers || !step) return;
    layers.monuments.setYear(step.year);
    layers.routes.setYear(step.year);
    layers.disasters.setYear(step.year);
    // « Nouvelles » inventions : apparues depuis l'étape précédente de la frise.
    layers.inventions.setStep(empire.id, step.year, empire.steps[index - 1]?.year ?? step.year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, step]);

  // Calque « Pays 2026 ».
  useEffect(() => {
    layers?.countries.setVisible(countries2026);
  }, [layers, countries2026]);

  // Figurines : armées et personnages de l'étape, lancés avec la caméra (le flyTo dure 2 s).
  useEffect(() => {
    if (!layers || !step) return;
    layers.figures.clear();
    if (figuresOn) {
      const reduced = prefersReducedMotion();
      const prev = seqPrevRef.current;
      // Pas de clear() des armées : start() réutilise les marqueurs des armées chaînées.
      const continued = prev ? continuedArmies(empire.steps, index) : [];
      const cities = citiesRef.current;
      layers.armies.start(step, prev, speedRef.current, reduced, continued, (a) => originName(a, step, empire.steps, cities));
      layers.figures.empireId = empire.id;
      layers.figures.show(step, speedRef.current, reduced, !reduced && continued.length > 0);
    } else {
      layers.armies.clear();
    }
    return () => {
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
