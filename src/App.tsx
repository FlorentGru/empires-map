import { useEffect, useState } from 'react';
import { EMPIRES, getEmpire } from './data/loadEmpire';
import { WorldMap } from './map/WorldMap';
import { AboutModal } from './panels/AboutModal';
import { EmpirePicker } from './panels/EmpirePicker';
import { EventPanel } from './panels/EventPanel';
import { readUrlState, writeUrlState } from './player/urlState';
import { usePlayer } from './player/usePlayer';
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

  useEffect(() => {
    writeUrlState(empire.id, step?.id);
  }, [empire.id, step?.id]);

  return (
    <div className="app">
      <h1 className="visually-hidden">Atlas des Empires — {empire.name}</h1>
      <WorldMap empire={empire} index={player.index} panelOpen={panelOpen} />

      <div className="top-bar">
        <EmpirePicker empires={EMPIRES} current={empire} onSelect={onSelectEmpire} />
        <button type="button" className="btn btn--ghost about-btn" onClick={() => setAboutOpen(true)} aria-haspopup="dialog">
          À propos
        </button>
      </div>

      <EventPanel step={step} open={panelOpen} onToggle={() => setPanelOpen((o) => !o)} />
      <Timeline empire={empire} player={player} />
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
