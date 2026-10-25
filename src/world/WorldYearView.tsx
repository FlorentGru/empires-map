import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GOTO_EVENT, type GotoDetail } from '../map/contemporaryLayers';
import { formatYear } from '../lib/years';
import { allStepYears, clampYear, empiresAt, MAX_YEAR, MIN_YEAR, nextStepYear } from '../lib/worldYear';
import { writeWorldUrl } from './worldUrl';
import { WorldPanel } from './WorldPanel';
import { SPEEDS, WorldTimeline } from './WorldTimeline';
import { WorldYearMap } from './WorldYearMap';
import './world.css';

const TICK_MS = 100;

interface Props {
  initialYear: number;
  /** Nom du dernier empire consulté (bouton de retour). */
  backName: string;
  onBack: () => void;
}

export function WorldYearView({ initialYear, backName, onBack }: Props) {
  const [year, setYear] = useState(() => clampYear(initialYear));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(SPEEDS[0]);
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth >= 768);
  const steps = useMemo(() => allStepYears(), []);
  const present = useMemo(() => empiresAt(year), [year]);
  const yearRef = useRef(year);
  yearRef.current = year;

  useEffect(() => writeWorldUrl(year), [year]);

  const step = useCallback(
    (dir: 1 | -1) => {
      setPlaying(false);
      setYear((y) => nextStepYear(y, dir, steps));
    },
    [steps],
  );

  // Lecture continue : speed ans par seconde, pause automatique en MAX_YEAR (fin du dernier empire).
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const cur = yearRef.current;
      const y = clampYear(cur + Math.max(1, (speed * TICK_MS) / 1000));
      setYear(y);
      if (y >= MAX_YEAR) setPlaying(false);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [playing, speed]);

  const togglePlay = useCallback(() => {
    if (yearRef.current >= MAX_YEAR) setYear(MIN_YEAR);
    setPlaying((p) => !p);
  }, []);

  // ← → : étape précédente / suivante (hors champs de saisie).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || (t.tagName === 'INPUT' && (t as HTMLInputElement).type !== 'range') || t.isContentEditable)
      )
        return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      step(e.key === 'ArrowRight' ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  const goto = useCallback((empire: string, stepId: string) => {
    window.dispatchEvent(new CustomEvent<GotoDetail>(GOTO_EVENT, { detail: { empire, step: stepId } }));
  }, []);

  const setYearManual = useCallback((y: number) => {
    setPlaying(false);
    setYear(y);
  }, []);

  return (
    <div className="app world-view">
      <h1 className="visually-hidden">Atlas des Empires — Le monde en l'an {year}</h1>
      <WorldYearMap year={year} />
      {/* L'année affichée, en grand au centre en haut : c'est le repère principal de cette vue. */}
      <div className="world-year" aria-live="polite">
        <span className="world-year__label">Le monde en</span>
        <span key={year} className="world-year__value">
          {formatYear(year)}
        </span>
        <span className="world-year__count">
          {present.length} empire{present.length > 1 ? 's' : ''} de l'Atlas
        </span>
      </div>
      <div className="top-bar">
        <button type="button" className="btn world-back" onClick={onBack}>
          ← Retour à l'empire<span className="world-back__name"> · {backName}</span>
        </button>
      </div>
      <WorldPanel year={year} present={present} open={panelOpen} onToggle={() => setPanelOpen((o) => !o)} onGoto={goto} />
      <WorldTimeline year={year} onYear={setYearManual} onStep={step} playing={playing} onTogglePlay={togglePlay} speed={speed} onSpeed={setSpeed} />
    </div>
  );
}
