import { useEffect, useMemo, useRef, useState } from 'react';
import monumentsData from '../../data/monuments.json';
import { EMPIRES } from '../data/loadEmpire';
import { ERA_LABELS, continentOf, eraOf, stepsShowing, type Era } from '../lib/monumentInfo';
import { formatYear } from '../lib/years';
import { requestFocusPoint } from '../map/focusEntity';
import { monumentIconSvg } from '../map/monumentIcons';
import { monumentSpan } from '../map/monumentLayers';
import type { Monument } from '../types-monument';
import { norm, Svg } from './svgUtils';

const ALL = monumentsData as Monument[];
const ERAS = Object.keys(ERA_LABELS) as Era[];

function MonumentDetail({ m, onBack, onNavigate }: { m: Monument; onBack: () => void; onNavigate: (empireId: string, stepId: string) => void }) {
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => backRef.current?.focus(), []);
  const steps = useMemo(() => stepsShowing(m, EMPIRES), [m]);
  return (
    <section className="gallery__detail" aria-labelledby="monument-title">
      <button ref={backRef} type="button" className="btn btn--ghost gallery__back" onClick={onBack}>
        ← Retour aux monuments
      </button>
      <div className="gallery__detail-main">
        <div className="gallery__detail-figs monuments__big">
          <Svg html={monumentIconSvg(m.kind).replace('width="56" height="56"', 'width="150" height="150"')} />
        </div>
        <div className="gallery__detail-text">
          <h2 id="monument-title">{m.name}</h2>
          {m.wonder && <p className="wonder-badge">✦ L’une des sept merveilles du monde</p>}
          <p className="gallery__era">
            {m.civilization} · {monumentSpan(m)} · {continentOf(m.location)}
          </p>
          <p>{m.description}</p>
          <p className="people__sources">
            <a href={m.wikipedia} target="_blank" rel="noopener noreferrer">
              Wikipédia ↗
            </a>
          </p>
        </div>
      </div>
      <h3>Voir sur la carte</h3>
      {steps.length === 0 ? (
        <p className="gallery__none">Aucune étape de l'Atlas ne passe près de ce monument pour l'instant.</p>
      ) : (
        <ul className="gallery__appears">
          {steps.map((s) => (
            <li key={`${s.empireId}/${s.stepId}`}>
              <button
                type="button"
                onClick={() => {
                  requestFocusPoint(m.location);
                  onNavigate(s.empireId, s.stepId);
                }}
              >
                <span className="gallery__appears-empire">{s.empireName}</span>
                <span className="gallery__appears-title">{s.title}</span>
                <span className="gallery__appears-year">{formatYear(s.year)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Les sept merveilles du monde antique, dans l'ordre chronologique. */
const WONDERS = ALL.filter((m) => m.wonder).sort((a, b) => a.built - b.built);

function MonumentCard({ m, onOpen }: { m: Monument; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      className={`gallery__card people__card monuments__card${m.wonder ? ' monuments__card--wonder' : ''}`}
      data-card
      data-uid={`m:${m.id}`}
      onClick={() => onOpen(m.id)}
    >
      <Svg html={monumentIconSvg(m.kind, { wonder: m.wonder })} />
      <span className="gallery__name">{m.name}</span>
      <span className="people__span">{monumentSpan(m)}</span>
    </button>
  );
}

/** Galerie des monuments (data/monuments.json) : par époque, filtrables par continent, fiche et étapes où les voir. */
export function MonumentsView({ query, onNavigate }: { query: string; onNavigate: (empireId: string, stepId: string) => void }) {
  const [continent, setContinent] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const continents = useMemo(() => [...new Set(ALL.map((m) => continentOf(m.location)))].sort(), []);
  const q = norm(query.trim());
  const list = ALL.filter(
    (m) =>
      (continent === 'all' || (continent === 'wonders' ? !!m.wonder : continentOf(m.location) === continent)) &&
      (!q || norm(`${m.name} ${m.civilization}`).includes(q)),
  ).sort((a, b) => a.built - b.built);
  const m = selected ? ALL.find((x) => x.id === selected) : undefined;
  if (m) return <MonumentDetail m={m} onBack={() => setSelected(null)} onNavigate={onNavigate} />;
  return (
    <section aria-labelledby="monuments-title">
      <h2 id="monuments-title" className="gallery__section">
        Monuments
      </h2>
      <div className="gallery__filters people__empires" role="group" aria-label="Filtrer par continent">
        {['all', 'wonders', ...continents].map((c) => (
          <button key={c} type="button" className="btn btn--ghost" aria-pressed={continent === c} onClick={() => setContinent(c)}>
            {c === 'all' ? 'Tous' : c === 'wonders' ? '✦ Sept merveilles' : c}
          </button>
        ))}
      </div>
      {continent === 'all' && !q && (
        <div className="monuments__wonders" aria-labelledby="wonders-title">
          <h3 id="wonders-title" className="monuments__era">
            ✦ Les sept merveilles du monde <small>(Antiquité)</small>
          </h3>
          <div className="gallery__grid">
            {WONDERS.map((x) => (
              <MonumentCard key={x.id} m={x} onOpen={setSelected} />
            ))}
          </div>
        </div>
      )}
      {ERAS.map((era) => {
        const items = list.filter((x) => eraOf(x) === era);
        if (!items.length) return null;
        return (
          <div key={era}>
            <h3 className="monuments__era">
              {ERA_LABELS[era]} <small>({items.length})</small>
            </h3>
            <div className="gallery__grid">
              {items.map((x) => (
                <MonumentCard key={x.id} m={x} onOpen={setSelected} />
              ))}
            </div>
          </div>
        );
      })}
      {list.length === 0 && <p className="gallery__none">Aucun monument ne correspond.</p>}
    </section>
  );
}
