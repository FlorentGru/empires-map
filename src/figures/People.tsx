import { useEffect, useMemo, useRef, useState } from 'react';
import { EMPIRES } from '../data/loadEmpire';
import { PEOPLE } from '../data/loadPeople';
import { formatYear } from '../lib/years';
import type { Person } from '../types';
import { characterSvg, FACTION_COLORS } from './registry';
import { norm, scaled, Svg } from './svgUtils';

export interface PersonRef {
  empire: string;
  id: string;
}

/** « 247 – 183 av. J.-C. », « né en 1769 », ou vide. */
export function lifeSpan(p: Pick<Person, 'born' | 'died'>): string {
  if (p.born !== undefined && p.died !== undefined) {
    // Une seule mention « av. J.-C. » quand les deux dates sont avant notre ère.
    if (p.born < 0 && p.died < 0) return `${-p.born} – ${formatYear(p.died)}`;
    return `${formatYear(p.born)} – ${formatYear(p.died)}`;
  }
  if (p.born !== undefined) return `né en ${formatYear(p.born)}`;
  if (p.died !== undefined) return `mort en ${formatYear(p.died)}`;
  return '';
}

/**
 * Étapes où apparaît la fiche : figures reliées par `person`, ou armées qu'il commande
 * (premier mot du nom, d'au moins 5 lettres, présent dans le libellé du camp : « Hannibal », « Gengis »).
 */
function appearances(empireId: string, person: Person) {
  const empire = EMPIRES.find((e) => e.id === empireId);
  if (!empire) return [];
  const key = norm(person.name.split(/[\s,]/)[0] ?? '');
  const leads = (side: string) => key.length >= 5 && norm(side).includes(key);
  return empire.steps
    .filter((s) => s.figures?.some((f) => f.person === person.id) || s.armies?.some((a) => leads(a.side)))
    .map((s) => ({ stepId: s.id, title: s.title, year: s.year }));
}

function PersonDetail({ empireId, person, onBack, onNavigate }: { empireId: string; person: Person; onBack: () => void; onNavigate: (empireId: string, stepId: string) => void }) {
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => backRef.current?.focus(), []);
  const list = useMemo(() => appearances(empireId, person), [empireId, person]);
  const color = FACTION_COLORS[person.faction];
  return (
    <section className="gallery__detail" aria-labelledby="person-title">
      <button ref={backRef} type="button" className="btn btn--ghost gallery__back" onClick={onBack}>
        ← Retour aux personnages
      </button>
      <div className="gallery__detail-main">
        <div className="gallery__detail-figs" style={{ borderColor: color }}>
          <figure>
            <Svg html={scaled(characterSvg(person.archetype), 5)} />
          </figure>
        </div>
        <div className="gallery__detail-text">
          <h2 id="person-title">{person.name}</h2>
          <p className="gallery__era">
            {person.title}
            {lifeSpan(person) ? ` · ${lifeSpan(person)}` : ''}
          </p>
          <p>{person.bio}</p>
          {person.keyFacts.length > 0 && (
            <ul className="people__facts">
              {person.keyFacts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
          {person.sources.length > 0 && (
            <p className="people__sources">
              Sources :{' '}
              {person.sources.map((s, i) => (
                <span key={s.url}>
                  {i > 0 && ' · '}
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.label}
                  </a>
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
      <h3>Apparaît dans</h3>
      {list.length === 0 ? (
        <p className="gallery__none">Pas encore représenté dans une étape.</p>
      ) : (
        <ul className="gallery__appears">
          {list.map((a) => (
            <li key={a.stepId}>
              <button type="button" onClick={() => onNavigate(empireId, a.stepId)}>
                <span className="gallery__appears-title">{a.title}</span>
                <span className="gallery__appears-year">{formatYear(a.year)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Personnages illustres : fiches biographiques par empire (data/empires/<id>/people.json),
 * avec la liste des étapes où ils apparaissent.
 */
export function PeopleView({ query, initial, onNavigate }: { query: string; initial?: PersonRef | null; onNavigate: (empireId: string, stepId: string) => void }) {
  const empires = EMPIRES.filter((e) => (PEOPLE[e.id]?.length ?? 0) > 0);
  // Par défaut : l'empire affiché sur la carte (paramètre d'URL), sinon le premier qui a des fiches.
  const current = new URLSearchParams(window.location.search).get('empire');
  const [empireId, setEmpireId] = useState(initial?.empire ?? (empires.some((e) => e.id === current) ? current! : empires[0]?.id ?? ''));
  const [selected, setSelected] = useState<string | null>(initial?.id ?? null);
  const q = norm(query.trim());
  const people = (PEOPLE[empireId] ?? []).filter((p) => !q || norm(`${p.name} ${p.title}`).includes(q));
  const person = selected ? PEOPLE[empireId]?.find((p) => p.id === selected) : undefined;

  if (person) return <PersonDetail empireId={empireId} person={person} onBack={() => setSelected(null)} onNavigate={onNavigate} />;
  return (
    <section aria-labelledby="people-title">
      <h2 id="people-title" className="gallery__section">
        Personnages illustres
      </h2>
      <div className="gallery__filters people__empires" role="group" aria-label="Choisir l'empire">
        {empires.map((e) => (
          <button key={e.id} type="button" className="btn btn--ghost" aria-pressed={e.id === empireId} onClick={() => setEmpireId(e.id)}>
            {e.name.split(',')[0]}
          </button>
        ))}
      </div>
      <div className="gallery__grid">
        {people.map((p) => (
          <button key={p.id} type="button" className="gallery__card people__card" data-card data-uid={`p:${p.id}`} style={{ borderBottomColor: FACTION_COLORS[p.faction] }} onClick={() => setSelected(p.id)}>
            <Svg html={scaled(characterSvg(p.archetype), 2.2)} />
            <span className="gallery__name">{p.name}</span>
            <span className="people__span">{lifeSpan(p)}</span>
          </button>
        ))}
      </div>
      {people.length === 0 && <p className="gallery__none">Aucun personnage ne correspond.</p>}
    </section>
  );
}
