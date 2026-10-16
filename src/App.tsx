import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { EMPIRES, getEmpire } from './data/loadEmpire';
import { WorldMap } from './map/WorldMap';
import { AboutModal } from './panels/AboutModal';
import { FeedbackDialog } from './feedback/FeedbackDialog';
import { OPEN_PERSON_EVENT, type OpenPersonDetail } from './data/loadPeople';
import { EmpirePicker } from './panels/EmpirePicker';
import { Legend } from './panels/Legend';
import { ViewControls } from './panels/ViewControls';
import { readBool, writeBool } from './lib/settings';
import { EventPanel } from './panels/EventPanel';
import { readUrlState, writeUrlState } from './player/urlState';
import { continuedArmies } from './map/armyLayer';
import { BASE_STEP_MS, usePlayer } from './player/usePlayer';
import { battleStepMs } from './lib/march';
import { chapterAt } from './lib/periods';
import { useStory } from './story/useStory';
import { Timeline } from './timeline/Timeline';
import { ChatPanel } from './chat/ChatPanel';
import { QuizDialog } from './quiz/QuizDialog';
import type { ChatContext } from './chat/ChatPanel';
import { clearWorldUrl, DEFAULT_WORLD_YEAR, readWorldYear, WorldYearView } from './world/WorldYearView';
import { CompareView } from './compare/CompareView';

/** ?compare=rome,china → les deux empires comparés (connus et distincts), sinon null. */
function readCompare(): { a: string; b: string } | null {
  const [a, b] = (new URLSearchParams(window.location.search).get('compare') ?? '').split(',');
  if (!a || !b || a === b || !EMPIRES.some((e) => e.id === a) || !EMPIRES.some((e) => e.id === b)) return null;
  return { a, b };
}

function writeCompare(c: { a: string; b: string } | null) {
  const url = new URL(window.location.href);
  if (c) url.searchParams.set('compare', `${c.a},${c.b}`);
  else url.searchParams.delete('compare');
  // Virgule lisible dans l'URL partagée (?compare=rome,china plutôt que rome%2Cchina).
  window.history.replaceState(null, '', url.toString().replace(/compare=([a-z_-]+)%2C/, 'compare=$1,'));
}
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
  // Comparaison de deux empires (?compare=a,b) à la place de l'Atlas.
  const [compare, setCompareState] = useState(readCompare);
  const setCompare = useCallback((c: { a: string; b: string } | null) => {
    writeCompare(c);
    setCompareState(c);
  }, []);

  // Vue « Le monde en l'an X » (?world=1&year=…) à la place de l'Atlas d'un empire.
  const [world, setWorld] = useState<{ year: number } | null>(() => (new URLSearchParams(window.location.search).get('world') === '1' ? { year: readWorldYear() } : null));
  const leaveWorld = useCallback(() => {
    clearWorldUrl();
    setWorld(null);
  }, []);
  const [galleryOpen, setGalleryOpen] = useState(() => new URLSearchParams(window.location.search).get('figures') === 'gallery');
  const [chatContext, setChatContext] = useState<ChatContext | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const openQuiz = useCallback(() => setQuizOpen(true), []);
  const closeGallery = useCallback(() => {
    clearFiguresParam();
    setPersonRef(null);
    setGalleryOpen(false);
  }, []);
  /** Depuis la galerie : va à l'étape d'un empire (URL puis remontage du lecteur, qui relit l'URL). */
  const goToStep = useCallback((id: string, stepId: string) => {
    clearFiguresParam();
    clearWorldUrl();
    setWorld(null);
    writeUrlState(id, stepId);
    setEmpireId(id);
    setNavKey((k) => k + 1);
    setGalleryOpen(false);
  }, []);

  // « Sa fiche » sur une carte de personnage : galerie ouverte sur sa biographie.
  const [personRef, setPersonRef] = useState<OpenPersonDetail | null>(null);
  useEffect(() => {
    const onOpen = (e: Event) => {
      setPersonRef((e as CustomEvent<OpenPersonDetail>).detail);
      setGalleryOpen(true);
    };
    window.addEventListener(OPEN_PERSON_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_PERSON_EVENT, onOpen);
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
  if (compare) {
    return (
      <CompareView
        key={`${compare.a}|${compare.b}`}
        a={compare.a}
        b={compare.b}
        onChange={(a, b) => setCompare({ a, b })}
        onExit={() => {
          setEmpireId(compare.a);
          setCompare(null);
        }}
      />
    );
  }
  if (world) {
    return (
      <>
        <WorldYearView initialYear={world.year} backName={empire.name} onBack={leaveWorld} />
        <ChatPanel context={chatContext} goToStep={goToStep} onOpenQuiz={openQuiz} />
      <QuizDialog open={quizOpen} onClose={() => setQuizOpen(false)} empire={empire.id} />
        {galleryOpen && (
          <Suspense fallback={null}>
            <Gallery onClose={closeGallery} onNavigate={goToStep} initialPerson={personRef} />
          </Suspense>
        )}
      </>
    );
  }
  // `key` : changer d'empire réinitialise le lecteur et la carte.
  return (
    <>
      <Atlas key={`${empire.id}:${navKey}`} empire={empire} onSelectEmpire={setEmpireId} onOpenWorld={(year) => setWorld({ year })} onOpenCompare={() => setCompare({ a: empire.id, b: EMPIRES.find((e) => e.id !== empire.id)!.id })} onOpenGallery={() => setGalleryOpen(true)} onContext={setChatContext} />
      <ChatPanel context={chatContext} goToStep={goToStep} onOpenQuiz={openQuiz} />
      <QuizDialog open={quizOpen} onClose={() => setQuizOpen(false)} empire={empire.id} />
      {galleryOpen && (
        <Suspense fallback={null}>
          <Gallery onClose={closeGallery} onNavigate={goToStep} initialPerson={personRef} />
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

function Atlas({ empire, onSelectEmpire, onOpenWorld, onOpenCompare, onOpenGallery, onContext }: { empire: Empire; onSelectEmpire: (id: string) => void; onOpenWorld: (year: number) => void; onOpenCompare: () => void; onOpenGallery: () => void; onContext: (c: ChatContext) => void }) {
  const player = usePlayer(empire.steps.length, initialIndex(empire), (i) =>
    battleStepMs(empire.steps[i]) ?? BASE_STEP_MS,
  );
  const step = empire.steps[player.index];
  const [panelOpen, setPanelOpen] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [tilted, setTilted] = useState(() => readBool('atlas.tilted', true));
  const [relief, setRelief] = useState(() => readBool('atlas.relief', true));
  const [figures, setFigures] = useState(() => readBool('atlas.figures', true));
  const [countries2026, setCountries2026] = useState(() => readBool('atlas.countries2026', false));
  const [stateNames, setStateNames] = useState(() => readBool('atlas.stateNames', true));
  const [neighbors, setNeighbors] = useState(() => readBool('atlas.neighbors', true));
  const [contemporaries, setContemporaries] = useState(() => readBool('atlas.contemporaries', true));
  const [monuments, setMonuments] = useState(() => readBool('atlas.monuments', true));
  const [routes, setRoutes] = useState(() => readBool('atlas.routes', true));
  const [disasters, setDisasters] = useState(() => readBool('atlas.disasters', true));
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
  const toggleMonuments = useCallback(() => setMonuments((v) => { writeBool('atlas.monuments', !v); return !v; }), []);
  const toggleRoutes = useCallback(() => setRoutes((v) => { writeBool('atlas.routes', !v); return !v; }), []);
  const toggleDisasters = useCallback(() => setDisasters((v) => { writeBool('atlas.disasters', !v); return !v; }), []);

  useEffect(() => {
    writeUrlState(empire.id, step?.id);
  }, [empire.id, step?.id]);

  useEffect(() => {
    onContext({ empire: empire.id, step: step?.id, titre: step?.title });
  }, [onContext, empire.id, step?.id, step?.title]);

  return (
    <div className="app">
      <h1 className="visually-hidden">Atlas des Empires — {empire.name}</h1>
      <WorldMap empire={empire} index={player.index} panelOpen={panelOpen} tilted={tilted} relief={relief} figures={figures} countries2026={countries2026} stateNames={stateNames} neighbors={neighbors} contemporaries={contemporaries} monuments={monuments} routes={routes} disasters={disasters} speed={player.speed} />

      <div className="top-bar">
        <EmpirePicker empires={EMPIRES} current={empire} onSelect={onSelectEmpire} onOpenWorld={() => onOpenWorld(step?.year ?? DEFAULT_WORLD_YEAR)} />
        <div className="top-bar__right">
          <ViewControls tilted={tilted} relief={relief} figures={figures} countries2026={countries2026} stateNames={stateNames} neighbors={neighbors} contemporaries={contemporaries} monuments={monuments} routes={routes} disasters={disasters} onToggleTilt={toggleTilt} onToggleRelief={toggleRelief} onToggleFigures={toggleFigures} onToggleCountries2026={toggleCountries2026} onToggleStateNames={toggleStateNames} onToggleNeighbors={toggleNeighbors} onToggleContemporaries={toggleContemporaries} onToggleMonuments={toggleMonuments} onToggleRoutes={toggleRoutes} onToggleDisasters={toggleDisasters} />
          <button type="button" className="btn btn--ghost" onClick={onOpenGallery} aria-haspopup="dialog">
            Galerie
          </button>
          <button type="button" className="btn btn--ghost" onClick={onOpenCompare} title="Comparer cet empire à un autre : cartes, population, économie, armée, politique…">
            ⇄ Comparer
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setFeedbackOpen(true)} aria-haspopup="dialog" title="Proposer une idée ou signaler une erreur">
            Votre avis
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
      <Legend empire={empire} step={step} countries2026={countries2026} neighbors={neighbors} contemporaries={contemporaries} monuments={monuments} routes={routes} disasters={disasters} />
      <Timeline empire={empire} player={player} compare2026={countries2026} story={story.controls} />
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} empire={empire.id} step={step?.id} />
    </div>
  );
}
