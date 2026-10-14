import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { eventMeta } from '../lib/eventTypes';
import { prefersReducedMotion } from '../lib/motion';
import { firstStepOfPeriods, periodIndexAt } from '../lib/periods';
import { formatYear } from '../lib/years';
import { SPEEDS, type Player, type Speed } from '../player/usePlayer';
import { StoryButton } from '../story/StoryMenu';
import type { StoryControls } from '../story/useStory';
import type { Empire } from '../types';
import { makeTicks, makeYearScale } from './scale';

interface Props {
  empire: Empire;
  player: Player;
  /** Calque « Pays 2026 » actif : la date affichée est comparée aux frontières actuelles. */
  compare2026?: boolean;
  story: StoryControls;
}

/** Largeur minimale par étape (px) : au-delà, la frise défile horizontalement. */
const MIN_PX_PER_STEP = 22;

export const Timeline = memo(function Timeline({ empire, player, compare2026 = false, story }: Props) {
  const { steps } = empire;
  const active = steps[player.index];
  const trackRef = useRef<HTMLDivElement>(null);

  const yearToX = useMemo(
    // Beaucoup d'étapes : on donne plus de poids au rang (étapes uniformément espacées) qu'aux années.
    () => makeYearScale(steps.map((s) => s.year), empire.start, empire.end, steps.length > 40 ? 0.3 : 0.45),
    [steps, empire.start, empire.end],
  );
  const periods = empire.periods;
  const firsts = useMemo(() => firstStepOfPeriods(empire), [empire]);
  const activePeriod = active ? periodIndexAt(periods, active.year) : -1;
  const innerRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(innerRef);
  // Au moins ~72 px entre deux graduations, quelle que soit la largeur d'écran.
  const ticks = useMemo(
    () => makeTicks(empire.start, empire.end, yearToX, width > 0 ? 72 / width : 0.07),
    [empire.start, empire.end, yearToX, width],
  );

  // Garder l'étape active visible quand la frise défile (sans faire défiler la page).
  useEffect(() => {
    const scroller = trackRef.current;
    const point = scroller?.querySelector<HTMLElement>('.timeline__point--active');
    if (!scroller || !point || scroller.scrollWidth <= scroller.clientWidth) return;
    const offset = point.getBoundingClientRect().left - scroller.getBoundingClientRect().left;
    scroller.scrollTo({
      left: scroller.scrollLeft + offset - scroller.clientWidth / 2,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, [player.index]);

  const pct = (x: number) => `${(x * 100).toFixed(3)}%`;

  return (
    <footer className="timeline" aria-label="Frise chronologique">
      <div className="timeline__controls">
        <button type="button" className="icon-btn" onClick={player.prev} aria-label="Étape précédente" title="Étape précédente (←)">
          ⏮
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--primary"
          onClick={player.toggle}
          aria-label={player.playing ? 'Pause' : 'Lecture'}
          title={player.playing ? 'Pause (Espace)' : 'Lecture (Espace)'}
        >
          {player.playing ? '⏸' : '▶'}
        </button>
        <button type="button" className="icon-btn" onClick={player.next} aria-label="Étape suivante" title="Étape suivante (→)">
          ⏭
        </button>
        <label className="timeline__speed">
          <span className="visually-hidden">Vitesse de lecture</span>
          <select value={player.speed} disabled={story.enabled} title={story.enabled ? 'Mode Histoire : le rythme suit la narration' : undefined} onChange={(e) => player.setSpeed(Number(e.target.value) as Speed)}>
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {String(s).replace('.', ',')}×
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="icon-btn"
          aria-pressed={player.loop}
          onClick={() => player.setLoop(!player.loop)}
          aria-label="Lecture en boucle"
          title="Lecture en boucle"
        >
          🔁
        </button>
        <StoryButton story={story} />
        <div className="timeline__current" aria-live="polite">
          <span className="timeline__year">{active ? formatYear(active.year) : ''}
            {compare2026 && <span className="timeline__compare"> · comparé à 2026</span>}
          </span>
          {periods && activePeriod >= 0 && (
            <span className="timeline__period" style={{ '--period-color': periods[activePeriod].color } as CSSProperties}>
              {periods[activePeriod].name}
            </span>
          )}
          <span className="timeline__title">{active?.title}</span>
          <span className="timeline__count">
            {player.index + 1} / {steps.length}
          </span>
        </div>
      </div>

      <div className="timeline__scroller" ref={trackRef}>
        <div className="timeline__track" ref={innerRef} style={{ minWidth: steps.length * MIN_PX_PER_STEP }}>
          <div className="timeline__axis" />
          {ticks.map((y) => (
            <span key={y} className="timeline__tick" style={{ left: pct(yearToX(y)) }}>
              {formatYear(y)}
            </span>
          ))}
          {periods?.map((p, pi) => {
            const a = yearToX(Math.max(p.start, empire.start));
            const b = yearToX(Math.min(p.end, empire.end));
            const target = firsts[pi];
            return (
              <button
                key={p.id}
                type="button"
                className={`timeline__period-band${pi === activePeriod ? ' timeline__period-band--active' : ''}`}
                style={{ left: pct(a), width: pct(Math.max(0, b - a)), '--period-color': p.color } as CSSProperties}
                disabled={target < 0}
                onClick={() => target >= 0 && player.goTo(target)}
                title={`${p.name} (${formatYear(p.start)} – ${formatYear(p.end)})`}
                aria-label={`Période : ${p.name}`}
                aria-current={pi === activePeriod ? 'true' : undefined}
              >
                <span>{p.name}</span>
              </button>
            );
          })}
          {active && <div className="timeline__cursor" style={{ left: pct(yearToX(active.year)) }} aria-hidden="true" />}
          <ol className="timeline__points">
            {steps.map((s, i) => {
              const meta = eventMeta(s.type);
              const isActive = i === player.index;
              return (
                <li key={s.id} style={{ left: pct(yearToX(s.year)) }}>
                  <button
                    type="button"
                    className={`timeline__point${isActive ? ' timeline__point--active' : ''}`}
                    style={{ '--point-color': meta.color } as CSSProperties}
                    onClick={() => player.goTo(i)}
                    aria-label={`${formatYear(s.year)} — ${s.title} (${meta.label})`}
                    aria-current={isActive ? 'step' : undefined}
                    title={`${formatYear(s.year)} — ${s.title}`}
                  />
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </footer>
  );
});

function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}
