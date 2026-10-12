import { useCallback, useEffect, useMemo, useState } from 'react';
import { EMPIRES, getEmpire } from './data/loadEmpire';
import { WorldMap } from './map/WorldMap';
import { AboutModal } from './panels/AboutModal';
import { EmpirePicker } from './panels/EmpirePicker';
import { Legend } from './panels/Legend';
import { ViewControls } from './panels/ViewControls';
import { readBool, writeBool } from './lib/settings';
import { EventPanel } from './panels/EventPanel';
import { readUrlState, writeUrlState } from './player/urlState';
import { usePlayer } from './player/usePlayer';
import { useStory } from './story/useStory';
import { Timeline } from './timeline/Timeline';
import type { Empire } from './types';

export function App() {
  const [empireId, setEmpireId] = useState(() => getEmpire(readUrlState().empire)?.id);
  const empire = getEmpire(empireId);

  if (!empire) {
    return (
      <main className="empty-state">
        <h1>Atlas des Empires</h1>
        <p>Aucune donnée d'empire trouvée dans data/empires/.</p>
      </main>
    );
  }
  // `key` : changer d'empire réinitialise le lecteur et la carte.
  return <Atlas key={empire.id} empire={empire} onSelectEmpire={setEmpireId} />;
}

function initialIndex(empire: Empire): number {
  const { empire: urlEmpire, step } = readUrlState();
  if (urlEmpire && urlEmpire !== empire.id) return 0;
  const i = empire.steps.findIndex((s) => s.id === step);
  return i >= 0 ? i : 0;
}

function Atlas({ empire, onSelectEmpire }: { empire: Empire; onSelectEmpire: (id: string) => void }) {
  const player = usePlayer(empire.steps.length, initialIndex(empire));
  const step = empire.steps[player.index];
  const [panelOpen, setPanelOpen] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [tilted, setTilted] = useState(() => readBool('atlas.tilted', true));
  const [relief, setRelief] = useState(() => readBool('atlas.relief', true));
  const [figures, setFigures] = useState(() => readBool('atlas.figures', true));
  const [countries2026, setCountries2026] = useState(() => readBool('atlas.countries2026', false));
  const openPanel = useCallback(() => setPanelOpen(true), []);
  const story = useStory(player, step, openPanel);
  const storyEnabled = story.controls.enabled;
  const storySilent = story.controls.silent;
  const panelStory = useMemo(
    () => (storyEnabled ? { segments: story.segments, current: story.current, silent: storySilent } : null),
    [storyEnabled, story.segments, story.current, storySilent],
  );
  const togglePanel = useCallback(() => setPanelOpen((o) => !o), []);
  const toggleTilt = useCallback(() => setTilted((v) => { writeBool('atlas.tilted', !v); return !v; }), []);
  const toggleRelief = useCallback(() => setRelief((v) => { writeBool('atlas.relief', !v); return !v; }), []);

  const toggleFigures = useCallback(() => setFigures((v) => { writeBool('atlas.figures', !v); return !v; }), []);

  const toggleCountries2026 = useCallback(() => setCountries2026((v) => { writeBool('atlas.countries2026', !v); return !v; }), []);

  useEffect(() => {
    writeUrlState(empire.id, step?.id);
  }, [empire.id, step?.id]);

  return (
    <div className="app">
      <h1 className="visually-hidden">Atlas des Empires — {empire.name}</h1>
      <WorldMap empire={empire} index={player.index} panelOpen={panelOpen} tilted={tilted} relief={relief} figures={figures} countries2026={countries2026} speed={player.speed} />

      <div className="top-bar">
        <EmpirePicker empires={EMPIRES} current={empire} onSelect={onSelectEmpire} />
        <div className="top-bar__right">
          <ViewControls tilted={tilted} relief={relief} figures={figures} countries2026={countries2026} onToggleTilt={toggleTilt} onToggleRelief={toggleRelief} onToggleFigures={toggleFigures} onToggleCountries2026={toggleCountries2026} />
          <button type="button" className="btn btn--ghost about-btn" onClick={() => setAboutOpen(true)} aria-haspopup="dialog">
            À propos
          </button>
        </div>
      </div>

      <EventPanel
        step={step}
        open={panelOpen}
        onToggle={togglePanel}
        story={panelStory}
      />
      <Legend empire={empire} step={step} countries2026={countries2026} />
      <Timeline empire={empire} player={player} compare2026={countries2026} story={story.controls} />
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
