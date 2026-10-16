import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { EMPIRES, getEmpire } from './data/loadEmpire';
import { WorldMap } from './map/WorldMap';
import { AboutModal } from './panels/AboutModal';
import { EmpirePicker } from './panels/EmpirePicker';
import { Legend } from './panels/Legend';
import { ViewControls } from './panels/ViewControls';
import { readBool, writeBool } from './lib/settings';
import { EventPanel } from './panels/EventPanel';
import { readUrlState, writeUrlState } from './player/urlState';
import { continuedArmies } from './map/armyLayer';
import { BASE_STEP_MS, BATTLE_STEP_MS, CHAINED_STEP_MS, usePlayer } from './player/usePlayer';
import { chapterAt } from './lib/periods';
import { useStory } from './story/useStory';
import { Timeline } from './timeline/Timeline';
import { ChatPanel } from './chat/ChatPanel';
import type { ChatContext } from './chat/ChatPanel';
import type { Empire } from './types';

// Galerie des figurines : chargée à la demande.
const Gallery = lazy(() => import('./figures/Gallery').then((m) => ({ default: m.Gallery })));

function clearFiguresParam() {
  const url = new URL(window.location.href);
  if (url.searchParams.has('figures')) {
    url.searchParams.delete('figures');
    window.history.replaceState(null, '', url);
  }
}

export function App() {
  const [empireId, setEmpireId] = useState(() => getEmpire(readUrlState().empire)?.id);
  const empire = getEmpire(empireId);
  const [navKey, setNavKey] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(() => new URLSearchParams(window.location.search).get('figures') === 'gallery');
  const [chatContext, setChatContext] = useState<ChatContext | null>(null);
  const closeGallery = useCallback(() => {
    clearFiguresParam();
    setGalleryOpen(false);
  }, []);
  /** Depuis la galerie : va à l'étape d'un empire (URL puis remontage du lecteur, qui relit l'URL). */
  const goToStep = useCallback((id: string, stepId: string) => {
    clearFiguresParam();
    writeUrlState(id, stepId);
    setEmpireId(id);
    setNavKey((k) => k + 1);
    setGalleryOpen(false);
  }, []);

  // Clic « Voir cet empire » d'un empire contemporain sur la carte (calque contemporaryLayers).
  useEffect(() => {
    const onGoto = (e: Event) => {
      const d = (e as CustomEvent<{ empire: string; step: string }>).detail;
      if (d && getEmpire(d.empire)) goToStep(d.empire, d.step);
    };
    window.addEventListener('atlas:goto', onGoto);
    return () => window.removeEventListener('atlas:goto', onGoto);
  }, [goToStep]);

  if (!empire) {
    return (
      <main className="empty-state">
        <h1>Atlas des Empires</h1>
        <p>Aucune donnée d'empire trouvée dans data/empires/.</p>
      </main>
    );
  }
  // `key` : changer d'empire réinitialise le lecteur et la carte.
  return (
    <>
      <Atlas key={`${empire.id}:${navKey}`} empire={empire} onSelectEmpire={setEmpireId} onOpenGallery={() => setGalleryOpen(true)} onContext={setChatContext} />
      <ChatPanel context={chatContext} goToStep={goToStep} />
      {galleryOpen && (
        <Suspense fallback={null}>
          <Gallery onClose={closeGallery} onNavigate={goToStep} />
        </Suspense>
      )}
    </>
  );
}

function initialIndex(empire: Empire): number {
  const { empire: urlEmpire, step } = readUrlState();
  if (urlEmpire && urlEmpire !== empire.id) return 0;
  const i = empire.steps.findIndex((s) => s.id === step);
  return i >= 0 ? i : 0;
}

function Atlas({ empire, onSelectEmpire, onOpenGallery, onContext }: { empire: Empire; onSelectEmpire: (id: string) => void; onOpenGallery: () => void; onContext: (c: ChatContext) => void }) {
  const player = usePlayer(empire.steps.length, initialIndex(empire), (i) =>
    continuedArmies(empire.steps, i).length > 0
      ? CHAINED_STEP_MS
      : (empire.steps[i]?.armies ?? []).some((a) => a.path.length >= 2) ? BATTLE_STEP_MS : BASE_STEP_MS,
  );
  const step = empire.steps[player.index];
  const [panelOpen, setPanelOpen] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [tilted, setTilted] = useState(() => readBool('atlas.tilted', true));
  const [relief, setRelief] = useState(() => readBool('atlas.relief', true));
  const [figures, setFigures] = useState(() => readBool('atlas.figures', true));
  const [countries2026, setCountries2026] = useState(() => readBool('atlas.countries2026', false));
  const [stateNames, setStateNames] = useState(() => readBool('atlas.stateNames', true));
  const [neighbors, setNeighbors] = useState(() => readBool('atlas.neighbors', true));
  const [contemporaries, setContemporaries] = useState(() => readBool('atlas.contemporaries', true));
  const openPanel = useCallback(() => setPanelOpen(true), []);
  const story = useStory(player, step, openPanel, empire);
  const storyEnabled = story.controls.enabled;
  const storySilent = story.controls.silent;
  const panelStory = useMemo(
    () => (storyEnabled ? { segments: story.segments, current: story.current, silent: storySilent } : null),
    [storyEnabled, story.segments, story.current, storySilent],
  );
  const panelChapter = useMemo(() => {
    const c = chapterAt(empire, player.index);
    return c?.first ? c : null;
  }, [empire, player.index]);
  const togglePanel = useCallback(() => setPanelOpen((o) => !o), []);
  const toggleTilt = useCallback(() => setTilted((v) => { writeBool('atlas.tilted', !v); return !v; }), []);
  const toggleRelief = useCallback(() => setRelief((v) => { writeBool('atlas.relief', !v); return !v; }), []);

  const toggleFigures = useCallback(() => setFigures((v) => { writeBool('atlas.figures', !v); return !v; }), []);

  const toggleCountries2026 = useCallback(() => setCountries2026((v) => { writeBool('atlas.countries2026', !v); return !v; }), []);

  const toggleStateNames = useCallback(() => setStateNames((v) => { writeBool('atlas.stateNames', !v); return !v; }), []);
  const toggleNeighbors = useCallback(() => setNeighbors((v) => { writeBool('atlas.neighbors', !v); return !v; }), []);
  const toggleContemporaries = useCallback(() => setContemporaries((v) => { writeBool('atlas.contemporaries', !v); return !v; }), []);

  useEffect(() => {
    writeUrlState(empire.id, step?.id);
  }, [empire.id, step?.id]);

  useEffect(() => {
    onContext({ empire: empire.id, step: step?.id, titre: step?.title });
  }, [onContext, empire.id, step?.id, step?.title]);

  return (
    <div className="app">
      <h1 className="visually-hidden">Atlas des Empires — {empire.name}</h1>
      <WorldMap empire={empire} index={player.index} panelOpen={panelOpen} tilted={tilted} relief={relief} figures={figures} countries2026={countries2026} stateNames={stateNames} neighbors={neighbors} contemporaries={contemporaries} speed={player.speed} />

      <div className="top-bar">
        <EmpirePicker empires={EMPIRES} current={empire} onSelect={onSelectEmpire} />
        <div className="top-bar__right">
          <ViewControls tilted={tilted} relief={relief} figures={figures} countries2026={countries2026} stateNames={stateNames} neighbors={neighbors} contemporaries={contemporaries} onToggleTilt={toggleTilt} onToggleRelief={toggleRelief} onToggleFigures={toggleFigures} onToggleCountries2026={toggleCountries2026} onToggleStateNames={toggleStateNames} onToggleNeighbors={toggleNeighbors} onToggleContemporaries={toggleContemporaries} />
          <button type="button" className="btn btn--ghost" onClick={onOpenGallery} aria-haspopup="dialog">
            Galerie
          </button>
          <button type="button" className="btn btn--ghost about-btn" onClick={() => setAboutOpen(true)} aria-haspopup="dialog">
            À propos
          </button>
        </div>
      </div>

      <EventPanel
        chapter={panelChapter}
        step={step}
        open={panelOpen}
        onToggle={togglePanel}
        story={panelStory}
      />
      <Legend empire={empire} step={step} countries2026={countries2026} neighbors={neighbors} contemporaries={contemporaries} />
      <Timeline empire={empire} player={player} compare2026={countries2026} story={story.controls} />
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
