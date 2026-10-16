import { useMemo } from 'react';
import disasters from '../../data/disasters.json';
import monuments from '../../data/monuments.json';
import routes from '../../data/routes.json';
import { activeDisasters, activeRoutes, formatDeaths } from '../lib/worldEvents';
import { formatYear } from '../lib/years';
import type { PresentEmpire } from '../lib/worldYear';
import { standingAt } from '../map/monumentLayers';
import type { Disaster } from '../types-disaster';
import type { Monument } from '../types-monument';
import type { TradeRoute } from '../types-route';
import './world.css';

interface Props {
  year: number;
  present: PresentEmpire[];
  open: boolean;
  onToggle: () => void;
  onGoto: (empireId: string, stepId: string) => void;
}

const MONUMENT_NAMES = 8;

/** Panneau « En l'an X » : empires présents, monuments debout, routes actives, catastrophes en cours. */
export function WorldPanel({ year, present, open, onToggle, onGoto }: Props) {
  const standing = useMemo(() => standingAt(monuments as Monument[], year), [year]);
  const liveRoutes = useMemo(() => activeRoutes(routes as TradeRoute[], year), [year]);
  const live = useMemo(() => activeDisasters(disasters as Disaster[], year), [year]);
  const title = year < 0 ? `En l'an ${formatYear(year)}` : `En l'an ${year}`;

  return (
    <aside className={`world-panel${open ? '' : ' world-panel--closed'}`} aria-label={title}>
      <button type="button" className="world-panel__toggle" aria-expanded={open} aria-controls="world-panel-body" onClick={onToggle}>
        <h2>{title}</h2>
        <span aria-hidden="true">{open ? '▾' : '▴'}</span>
      </button>
      {open && (
        <div className="world-panel__body" id="world-panel-body">
          <section aria-label="Empires présents">
            <h3>
              Empires <span className="world-panel__count">{present.length}</span>
            </h3>
            {present.length === 0 && <p className="world-panel__none">Aucun des empires de l'Atlas n'existe encore.</p>}
            <ul className="world-panel__list">
              {present.map(({ empire, step }) => (
                <li key={empire.id} className="world-panel__empire">
                  <span className="world-panel__swatch" style={{ background: empire.color }} aria-hidden="true" />
                  <div>
                    <strong>{empire.name}</strong>
                    <span className="world-panel__step">
                      {step.title} · {formatYear(step.year)}
                    </span>
                    <button type="button" className="world-panel__go" onClick={() => onGoto(empire.id, step.id)}>
                      Voir dans cet empire →
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="Monuments debout">
            <h3>
              Monuments debout <span className="world-panel__count">{standing.length}</span>
            </h3>
            {standing.length > 0 ? (
              <p className="world-panel__text">
                {standing
                  .slice(0, MONUMENT_NAMES)
                  .map((m) => m.name)
                  .join(', ')}
                {standing.length > MONUMENT_NAMES ? `, et ${standing.length - MONUMENT_NAMES} autres…` : '.'}
              </p>
            ) : (
              <p className="world-panel__none">Aucun grand monument recensé.</p>
            )}
          </section>

          <section aria-label="Routes actives">
            <h3>
              Routes actives <span className="world-panel__count">{liveRoutes.length}</span>
            </h3>
            {liveRoutes.length > 0 ? <p className="world-panel__text">{liveRoutes.map((r) => r.name).join(', ')}.</p> : <p className="world-panel__none">Aucune route recensée.</p>}
          </section>

          <section aria-label="Catastrophes en cours">
            <h3>
              Catastrophes en cours <span className="world-panel__count">{live.length}</span>
            </h3>
            {live.length > 0 ? (
              <ul className="world-panel__plain">
                {live.map((d) => (
                  <li key={d.id}>
                    {d.name} <span className="world-panel__step">{formatDeaths(d.deaths)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="world-panel__none">Aucune catastrophe recensée.</p>
            )}
          </section>
        </div>
      )}
    </aside>
  );
}
