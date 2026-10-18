import { useEffect, useMemo, useRef, useState } from 'react';
import disastersData from '../../data/disasters.json';
import { EMPIRES } from '../data/loadEmpire';
import { nearestStepFor } from '../lib/monumentInfo';
import { formatDeaths } from '../lib/worldEvents';
import { formatYear } from '../lib/years';
import { DISASTER_LABELS, requestDisasterPreview } from '../map/disasterLayers';
import type { Disaster, DisasterKind } from '../types-disaster';
import { norm } from './svgUtils';

const ALL = disastersData as Disaster[];
const span = (d: Disaster) => (d.start === d.end ? formatYear(d.start) : `${formatYear(d.start)} – ${formatYear(d.end)}`);

function DisasterDetail({ d, onBack, onNavigate }: { d: Disaster; onBack: () => void; onNavigate: (empireId: string, stepId: string) => void }) {
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => backRef.current?.focus(), []);
  const near = useMemo(() => nearestStepFor(d.location, d.start, EMPIRES), [d]);
  const k = DISASTER_LABELS[d.kind];
  return (
    <section className="gallery__detail" aria-labelledby="disaster-title">
      <button ref={backRef} type="button" className="btn btn--ghost gallery__back" onClick={onBack}>
        ← Retour aux catastrophes
      </button>
      <div className="gallery__detail-main">
        <div className={`gallery__detail-figs disasters__big disasters__big--${d.kind}`} aria-hidden="true">
          {k.icon}
        </div>
        <div className="gallery__detail-text">
          <h2 id="disaster-title">{d.name}</h2>
          <p className="gallery__era">
            {k.label} · {span(d)}
          </p>
          <p className="disasters__deaths">
            {formatDeaths(d.deaths)}{' '}
            <small>
              (estimations : {formatDeaths(d.deathsLow).replace('≈ ', '')} à {formatDeaths(d.deathsHigh).replace('≈ ', '')})
            </small>
          </p>
          <p className="disasters__note">{d.uncertainty}</p>
          {d.belligerents?.length ? <p>Belligérants : {d.belligerents.join(', ')}.</p> : null}
          <p>{d.description}</p>
          <p className="people__sources">
            Sources :{' '}
            {d.sources.map((s, i) => (
              <span key={s.url}>
                {i > 0 && ' · '}
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.label}
                </a>
              </span>
            ))}
          </p>
        </div>
      </div>
      {near && (
        <>
          <h3>Voir sur la carte</h3>
          <ul className="gallery__appears">
            <li>
              <button
                type="button"
                onClick={() => {
                  requestDisasterPreview(d.id);
                  onNavigate(near.empireId, near.stepId);
                }}
              >
                <span className="gallery__appears-empire">{near.empireName}</span>
                <span className="gallery__appears-title">Étape la plus proche : {near.title}</span>
                <span className="gallery__appears-year">{formatYear(near.year)}</span>
              </button>
            </li>
          </ul>
        </>
      )}
    </section>
  );
}

/** Galerie des catastrophes, épidémies et guerres (data/disasters.json) : par type, fiche, aperçu sur la carte. */
export function DisastersView({ query, onNavigate }: { query: string; onNavigate: (empireId: string, stepId: string) => void }) {
  const [kind, setKind] = useState<DisasterKind | 'all'>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const kinds = useMemo(() => [...new Set(ALL.map((d) => d.kind))], []);
  const q = norm(query.trim());
  const list = ALL.filter((d) => (kind === 'all' || d.kind === kind) && (!q || norm(`${d.name} ${d.description}`).includes(q))).sort(
    (a, b) => a.start - b.start,
  );
  const d = selected ? ALL.find((x) => x.id === selected) : undefined;
  if (d) return <DisasterDetail d={d} onBack={() => setSelected(null)} onNavigate={onNavigate} />;
  return (
    <section aria-labelledby="disasters-title">
      <h2 id="disasters-title" className="gallery__section">
        Catastrophes et guerres
      </h2>
      <div className="gallery__filters people__empires" role="group" aria-label="Filtrer par type">
        {(['all', ...kinds] as const).map((k) => (
          <button key={k} type="button" className="btn btn--ghost" aria-pressed={kind === k} onClick={() => setKind(k)}>
            {k === 'all' ? 'Tous' : `${DISASTER_LABELS[k].icon} ${DISASTER_LABELS[k].label}`}
          </button>
        ))}
      </div>
      <div className="gallery__grid">
        {list.map((x) => (
          <button
            key={x.id}
            type="button"
            className={`gallery__card people__card disasters__card disasters__card--${x.kind}`}
            data-card
            data-uid={`d:${x.id}`}
            onClick={() => setSelected(x.id)}
          >
            <span className="disasters__icon" aria-hidden="true">
              {DISASTER_LABELS[x.kind].icon}
            </span>
            <span className="gallery__name">{x.name}</span>
            <span className="people__span">
              {span(x)} · {formatDeaths(x.deaths)}
            </span>
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="gallery__none">Aucun événement ne correspond.</p>}
    </section>
  );
}
