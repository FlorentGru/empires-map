import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { apogeeStepId, formatArea, normalizedAreas } from '../lib/apogee';
import disastersData from '../../data/disasters.json';
import type { Disaster } from '../types-disaster';
import { disastersBetween, formatDeaths } from '../lib/worldEvents';
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
/** Hauteur (px) de la courbe de puissance, posée sur l'axe. */
const CURVE_H = 20;

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
  // Écart minimal entre deux graduations : plus large quand les libellés portent « av. J.-C. ».
  const minPx = empire.start < 0 ? 100 : 72;
  const ticks = useMemo(
    () => makeTicks(empire.start, empire.end, yearToX, width > 0 ? minPx / width : 0.07),
    [empire.start, empire.end, yearToX, width, minPx],
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

  // Apogée (plus grande surface) et courbe de puissance : surfaces normalisées, posées au-dessus de l'axe.
  const apogeeId = useMemo(() => apogeeStepId(empire), [empire]);
  const areas = empire.stats?.areas;
  const curve = useMemo(() => {
    if (!areas) return null;
    const values = normalizedAreas(steps.map((s) => s.id), areas);
    const pts = steps.map((s, i) => `${(yearToX(s.year) * 1000).toFixed(1)},${(CURVE_H * (1 - values[i])).toFixed(2)}`);
    const first = (yearToX(steps[0].year) * 1000).toFixed(1);
    const last = (yearToX(steps[steps.length - 1].year) * 1000).toFixed(1);
    return { line: pts.join(' '), area: `${first},${CURVE_H} ${pts.join(' ')} ${last},${CURVE_H}` };
  }, [areas, steps, yearToX]);
  const isApogee = !!active && active.id === apogeeId;
  // Catastrophes et guerres meurtrières pendant la vie de l'empire : fines barres en haut de la piste.
  const disasters = useMemo(() => disastersBetween(disastersData as Disaster[], empire.start, empire.end), [empire.start, empire.end]);

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
          {isApogee && (
            <span className="timeline__apogee-badge" title={empire.apogee?.note ?? "L'empire atteint ici sa plus grande étendue"}>
              ♛ Apogée{areas?.[active.id] ? ` · ${formatArea(areas[active.id])}` : ''}
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
          {curve && (
            <svg className="timeline__power" viewBox={`0 0 1000 ${CURVE_H}`} preserveAspectRatio="none" aria-hidden="true">
              <polygon points={curve.area} />
              <polyline points={curve.line} vectorEffect="non-scaling-stroke" />
            </svg>
          )}
          {disasters.map((d) => {
            const a = yearToX(Math.max(d.start, empire.start));
            const b = yearToX(Math.min(d.end, empire.end));
            return (
              <span
                key={d.id}
                className={`timeline__disaster timeline__disaster--${d.kind}`}
                style={{ left: pct(a), width: `max(3px, ${pct(b - a)})` }}
                title={`${d.name} (${formatYear(d.start)}${d.end !== d.start ? ` – ${formatYear(d.end)}` : ''}) · ${formatDeaths(d.deaths)}`}
              />
            );
          })}
          <div className="timeline__axis" />
          {ticks.map((y, i) => (
            <span
              key={y}
              // Premier et dernier libellés alignés sur le bord pour ne pas être coupés.
              className={`timeline__tick${i === 0 ? ' timeline__tick--first' : i === ticks.length - 1 ? ' timeline__tick--last' : ''}`}
              style={{ left: pct(yearToX(y)) }}
            >
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
              const apogee = s.id === apogeeId;
              const area = areas?.[s.id] ? ` · ${formatArea(areas[s.id])}` : '';
              return (
                <li key={s.id} className={apogee ? 'timeline__apogee' : undefined} style={{ left: pct(yearToX(s.year)) }}>
                  {apogee && <span className="timeline__apogee-crown" aria-hidden="true">♛ Apogée</span>}
                  <button
                    type="button"
                    className={`timeline__point${isActive ? ' timeline__point--active' : ''}${apogee ? ' timeline__point--apogee' : ''}`}
                    style={{ '--point-color': meta.color } as CSSProperties}
                    onClick={() => player.goTo(i)}
                    aria-label={`${formatYear(s.year)} — ${s.title} (${meta.label})${apogee ? ' — apogée de l\'empire' : ''}`}
                    aria-current={isActive ? 'step' : undefined}
                    title={`${formatYear(s.year)} — ${s.title}${apogee ? ' — ♛ apogée' : ''}${area}`}
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
