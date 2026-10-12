import { memo, useEffect, useId, useState, type CSSProperties } from 'react';
import { loadTerritory } from '../data/loadEmpire';
import { EVENT_TYPES } from '../lib/eventTypes';
import { DIFF_COLORS } from '../map/diff';
import { variantFill, variantLine } from '../map/color';
import type { Empire, EventType, TimelineStep } from '../types';

interface Props {
  empire: Empire;
  step: TimelineStep | undefined;
}

const TYPES = Object.keys(EVENT_TYPES) as EventType[];

/** Noms des entités du territoire de l'étape (properties.name), dans l'ordre des features. */
function useEntityNames(empire: Empire, territory: string | undefined): string[] {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    if (!territory) return;
    let cancelled = false;
    void loadTerritory(empire.id, territory).then((fc) => {
      if (!cancelled) setNames(fc.features.map((f) => f.properties?.name).filter((n): n is string => !!n));
    });
    return () => {
      cancelled = true;
    };
  }, [empire.id, territory]);
  return names;
}

function isMobile(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

export const Legend = memo(function Legend({ empire, step }: Props) {
  const [open, setOpen] = useState(() => !isMobile());
  const titleId = useId();
  const bodyId = useId();
  const names = useEntityNames(empire, step?.territory);
  const entities = names.length > 0 ? names : [empire.name];

  return (
    <section className={`legend${open ? ' legend--open' : ''}`} aria-labelledby={titleId}>
      <button type="button" className="legend__toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={bodyId}>
        <span className="legend__qmark" aria-hidden="true">
          ?
        </span>
        <span id={titleId} className="legend__title">
          Légende
        </span>
        <span className="legend__chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      <div id={bodyId} className="legend__body" hidden={!open}>
        <h3>Événements (frise)</h3>
        <ul className="legend__list legend__list--cols">
          {TYPES.map((t) => {
            const m = EVENT_TYPES[t];
            return (
              <li key={t}>
                <span className="legend__dot" style={{ '--c': m.color } as CSSProperties} aria-hidden="true" />
                <span aria-hidden="true">{m.icon}</span> {m.label}
              </li>
            );
          })}
        </ul>

        <h3>Carte</h3>
        <ul className="legend__list">
          {entities.map((n, i) => (
            <li key={n}>
              <span
                className="legend__swatch"
                style={{ background: variantFill(empire.color, i), borderColor: variantLine(empire.color, i) }}
                aria-hidden="true"
              />
              Territoire : {n}
            </li>
          ))}
          <li>
            <span className="legend__swatch legend__swatch--diff" style={{ '--c': DIFF_COLORS.gained } as CSSProperties} aria-hidden="true">
              +
            </span>
            Zone gagnée (vert)
          </li>
          <li>
            <span className="legend__swatch legend__swatch--diff" style={{ '--c': DIFF_COLORS.lost } as CSSProperties} aria-hidden="true">
              −
            </span>
            Zone perdue (rouge)
          </li>
          <li>
            <span className="legend__marker" aria-hidden="true">
              ⚔
            </span>
            Lieu de la bataille ou de l'événement
          </li>
          <li>
            <span className="legend__city" aria-hidden="true" />
            Ville
          </li>
          <li>
            <span className="legend__city legend__city--capital" aria-hidden="true" />
            Capitale (en gras)
          </li>
        </ul>
      </div>
    </section>
  );
});
