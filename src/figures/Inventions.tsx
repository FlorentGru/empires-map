import { useEffect, useMemo, useRef, useState } from 'react';
import { readUrlState } from '../player/urlState';
import { EMPIRES } from '../data/loadEmpire';
import { INVENTIONS, requestInventionOpen } from '../data/loadInventions';
import { formatYear } from '../lib/years';
import { CATEGORY_LABELS, inventionIconSvg } from '../map/inventionIcons';
import type { Invention } from '../types-invention';
import { norm, Svg } from './svgUtils';

/** Étape où voir l'invention : la première dont l'année est ≥ celle de l'invention (sinon la dernière). */
export function stepForInvention(empireId: string, year: number) {
  const e = EMPIRES.find((x) => x.id === empireId);
  if (!e) return null;
  const s = e.steps.find((x) => x.year >= year) ?? e.steps[e.steps.length - 1];
  return s ? { stepId: s.id, title: s.title, year: s.year } : null;
}

function InventionDetail({
  empireId,
  inv,
  onBack,
  onNavigate,
}: {
  empireId: string;
  inv: Invention;
  onBack: () => void;
  onNavigate: (empireId: string, stepId: string) => void;
}) {
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => backRef.current?.focus(), []);
  const s = useMemo(() => stepForInvention(empireId, inv.year), [empireId, inv.year]);
  return (
    <section className="gallery__detail" aria-labelledby="invention-title">
      <button ref={backRef} type="button" className="btn btn--ghost gallery__back" onClick={onBack}>
        ← Retour aux inventions
      </button>
      <div className="gallery__detail-main">
        <div className="gallery__detail-figs monuments__big">
          <Svg html={inventionIconSvg(inv.category).replace('width="56" height="56"', 'width="150" height="150"')} />
        </div>
        <div className="gallery__detail-text">
          <h2 id="invention-title">{inv.name}</h2>
          <p className="gallery__era">
            {CATEGORY_LABELS[inv.category]} · {inv.approx ? 'vers ' : ''}
            {formatYear(inv.year)} · {inv.place}
            {inv.inventor ? ` · ${inv.inventor}` : ''}
          </p>
          <p>{inv.description}</p>
          <p className="inventions__impact">
            <strong>Pourquoi c'est révolutionnaire :</strong> {inv.impact}
          </p>
          <p className="people__sources">
            Sources :{' '}
            {inv.sources.map((x, i) => (
              <span key={x.url}>
                {i > 0 && ' · '}
                <a href={x.url} target="_blank" rel="noopener noreferrer">
                  {x.label}
                </a>
              </span>
            ))}
          </p>
        </div>
      </div>
      {s && (
        <>
          <h3>Voir sur la carte</h3>
          <ul className="gallery__appears">
            <li>
              <button
                type="button"
                onClick={() => {
                  requestInventionOpen(inv.id);
                  onNavigate(empireId, s.stepId);
                }}
              >
                <span className="gallery__appears-title">{s.title}</span>
                <span className="gallery__appears-year">{formatYear(s.year)}</span>
              </button>
            </li>
          </ul>
        </>
      )}
    </section>
  );
}

/** Galerie des inventions révolutionnaires, par empire (data/empires/<id>/inventions.json). */
export function InventionsView({ query, onNavigate }: { query: string; onNavigate: (empireId: string, stepId: string) => void }) {
  const empires = EMPIRES.filter((e) => (INVENTIONS[e.id]?.length ?? 0) > 0);
  const current = readUrlState().empire;
  const [empireId, setEmpireId] = useState(empires.some((e) => e.id === current) ? current! : (empires[0]?.id ?? ''));
  const [selected, setSelected] = useState<string | null>(null);
  const q = norm(query.trim());
  const list = (INVENTIONS[empireId] ?? []).filter((i) => !q || norm(`${i.name} ${i.place} ${i.inventor ?? ''}`).includes(q));
  const inv = selected ? INVENTIONS[empireId]?.find((i) => i.id === selected) : undefined;
  if (inv) return <InventionDetail empireId={empireId} inv={inv} onBack={() => setSelected(null)} onNavigate={onNavigate} />;
  return (
    <section aria-labelledby="inventions-title">
      <h2 id="inventions-title" className="gallery__section">
        Inventions révolutionnaires
      </h2>
      <div className="gallery__filters people__empires" role="group" aria-label="Choisir l'empire">
        {empires.map((e) => (
          <button key={e.id} type="button" className="btn btn--ghost" aria-pressed={e.id === empireId} onClick={() => setEmpireId(e.id)}>
            {e.name.split(',')[0]}
          </button>
        ))}
      </div>
      <div className="gallery__grid">
        {list.map((x) => (
          <button
            key={x.id}
            type="button"
            className="gallery__card people__card monuments__card"
            data-card
            data-uid={`i:${x.id}`}
            onClick={() => setSelected(x.id)}
          >
            <Svg html={inventionIconSvg(x.category)} />
            <span className="gallery__name">{x.name}</span>
            <span className="people__span">
              {x.approx ? 'vers ' : ''}
              {formatYear(x.year)} · {CATEGORY_LABELS[x.category]}
            </span>
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="gallery__none">Aucune invention ne correspond.</p>}
    </section>
  );
}
