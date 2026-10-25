import { useMemo, useRef } from 'react';
import { EMPIRES } from '../data/loadEmpire';
import { formatYear } from '../lib/years';
import { clampYear, MAX_YEAR, MIN_YEAR, posToYear, yearToPos } from '../lib/worldYear';
import './world.css';

export const SPEEDS = [10, 25, 50] as const;
// Graduations espacées : avant -500 la piste est comprimée, les libellés « av. J.-C. » sont longs.
const RULER = [MIN_YEAR, -1500, -500, 1, 500, 1000, 1500, MAX_YEAR];
const PERMILLE = 1000;
const pct = (year: number) => `${(yearToPos(year) * 100).toFixed(3)}%`;

interface Props {
  year: number;
  onYear: (y: number) => void;
  onStep: (dir: 1 | -1) => void;
  playing: boolean;
  onTogglePlay: () => void;
  speed: number;
  onSpeed: (s: number) => void;
}

/** Frise mondiale : une bande par empire, étapes en repères, curseur d'année (échelle non linéaire). */
export function WorldTimeline({ year, onYear, onStep, playing, onTogglePlay, speed, onSpeed }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const fromPointer = (clientX: number) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r || r.width <= 0) return;
    onYear(clampYear(posToYear((clientX - r.left) / r.width)));
  };

  const ticks = useMemo(() => EMPIRES.map((e) => e.steps.map((s) => s.year)), []);

  return (
    <section className="world-tl" aria-label="Frise du monde" style={{ ['--world-rows' as string]: EMPIRES.length }}>
      <div className="world-tl__controls">
        <button type="button" className="world-tl__btn" onClick={() => onStep(-1)} aria-label="Étape précédente (tous empires)" title="Étape précédente (←)">
          ⏮
        </button>
        <button
          type="button"
          className="world-tl__btn world-tl__btn--play"
          onClick={onTogglePlay}
          aria-label={playing ? 'Pause' : 'Lecture'}
          aria-pressed={playing}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <button type="button" className="world-tl__btn" onClick={() => onStep(1)} aria-label="Étape suivante (tous empires)" title="Étape suivante (→)">
          ⏭
        </button>
        <div className="world-tl__speeds" role="group" aria-label="Vitesse de lecture">
          {SPEEDS.map((s) => (
            <button key={s} type="button" className="world-tl__speed" aria-pressed={speed === s} onClick={() => onSpeed(s)} title={`${s} ans par seconde`}>
              {s}
            </button>
          ))}
          <span className="world-tl__unit">ans/s</span>
        </div>
        <output className="world-tl__year" aria-live="off">
          {formatYear(year)}
        </output>
      </div>

      <div className="world-tl__body">
        <div className="world-tl__names" aria-hidden="true">
          <span className="world-tl__ruler-pad" />
          {EMPIRES.map((e) => (
            <span key={e.id} className="world-tl__name">
              <i style={{ background: e.color }} />
              {e.name}
            </span>
          ))}
        </div>
        <div
          className="world-tl__track"
          ref={trackRef}
          onPointerDown={(ev) => {
            if ((ev.target as HTMLElement).tagName === 'INPUT') return;
            dragging.current = true;
            ev.currentTarget.setPointerCapture(ev.pointerId);
            fromPointer(ev.clientX);
          }}
          onPointerMove={(ev) => dragging.current && fromPointer(ev.clientX)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
        >
          <div className="world-tl__ruler" aria-hidden="true">
            {RULER.map((y) => (
              <span key={y} style={{ left: pct(y) }} data-edge={y === MIN_YEAR ? 'start' : y === MAX_YEAR ? 'end' : undefined}>
                {formatYear(y)}
              </span>
            ))}
          </div>
          {EMPIRES.map((e, i) => (
            <div key={e.id} className="world-tl__row" aria-hidden="true">
              <div
                className="world-tl__band"
                style={{ left: pct(e.start), width: `${((yearToPos(e.end) - yearToPos(e.start)) * 100).toFixed(3)}%`, background: e.color }}
                title={e.name}
              />
              {ticks[i]!.map((y, k) => (
                <span key={k} className="world-tl__tick" style={{ left: pct(y) }} />
              ))}
            </div>
          ))}
          <div className="world-tl__cursor" style={{ left: pct(year) }} aria-hidden="true" />
          <input
            type="range"
            className="world-tl__range"
            min={0}
            max={PERMILLE}
            step={1}
            value={Math.round(yearToPos(year) * PERMILLE)}
            aria-label="Année"
            aria-valuetext={formatYear(year)}
            onChange={(ev) => onYear(clampYear(posToYear(Number(ev.target.value) / PERMILLE)))}
            onKeyDown={(ev) => {
              // ← → : étape précédente / suivante, comme ailleurs dans la vue.
              if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') ev.preventDefault();
            }}
          />
        </div>
      </div>
    </section>
  );
}
