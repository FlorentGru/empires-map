import { useEffect, useMemo, useRef, useState } from 'react';
import cityInfo from '../../data/city-info.json';
import citiesData from '../../data/cities.json';
import monumentsData from '../../data/monuments.json';
import { EMPIRES, EMPIRE_INDEX } from '../data/loadEmpire';
import { haversineKm } from '../lib/march';
import { continentOf, stepsShowing } from '../lib/monumentInfo';
import { formatYear } from '../lib/years';
import { requestFocusPoint } from '../map/focusEntity';
import type { City } from '../types';
import type { CityInfo } from '../types-city';
import type { Monument } from '../types-monument';
import { norm } from './svgUtils';

type Entry = { city: City; info: CityInfo };

const byId = new Map((citiesData as City[]).map((c) => [c.id, c]));
/** Villes ayant une fiche (data/city-info.json), jointes à data/cities.json ; triées par fondation. */
const ALL: Entry[] = (cityInfo as CityInfo[])
  .flatMap((info) => {
    const city = byId.get(info.id);
    return city ? [{ city, info }] : [];
  })
  .sort((a, b) => a.city.founded - b.city.founded);
const MONUMENTS = monumentsData as Monument[];
const empireName = (id: string) => EMPIRE_INDEX.find((e) => e.id === id)?.name.split(',')[0] ?? id;
const periodName = (c: City) => c.names[0]?.name ?? c.modern;
/** Nom d'époque à afficher en plus du nom moderne, sauf s'il le répète (« Suse » dans « Suse, Iran »). */
const otherName = (c: City) => (c.modern.startsWith(periodName(c)) ? null : periodName(c));
const nameSpan = (n: { from?: number; to?: number }) =>
  n.from === undefined && n.to === undefined ? '' : ` (${n.from === undefined ? '…' : formatYear(n.from)} – ${n.to === undefined ? '…' : formatYear(n.to)})`;

function CityDetail({ e, onBack, onNavigate }: { e: Entry; onBack: () => void; onNavigate: (empireId: string, stepId: string) => void }) {
  const { city, info } = e;
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => backRef.current?.focus(), []);
  const steps = useMemo(() => stepsShowing({ location: city.coords, built: city.founded, until: city.destroyed }, EMPIRES, 300), [city]);
  const near = useMemo(() => MONUMENTS.filter((m) => haversineKm(m.location, city.coords) <= 30), [city]);
  return (
    <section className="gallery__detail" aria-labelledby="city-title">
      <button ref={backRef} type="button" className="btn btn--ghost gallery__back" onClick={onBack}>
        ← Retour aux villes
      </button>
      <div className="gallery__detail-text">
        <h2 id="city-title">{city.modern}</h2>
        <p className="gallery__era">
          Fondée en {formatYear(city.founded)}
          {city.destroyed !== undefined && ` · abandonnée en ${formatYear(city.destroyed)}`} · {continentOf(city.coords)}
        </p>
        {(city.names.length > 1 || periodName(city) !== city.modern) && (
          <p>
            <strong>Noms successifs :</strong> {city.names.map((n) => `${n.name}${nameSpan(n)}`).join(' → ')}
          </p>
        )}
        {city.capitalOf && city.capitalOf.length > 0 && (
          <p>
            <strong>Capitale de :</strong> {city.capitalOf.map((c) => `${empireName(c.empire)} (${formatYear(c.from)} – ${formatYear(c.to)})`).join(', ')}
          </p>
        )}
        {info.population && (
          <p>
            <strong>Population :</strong> {info.population}
          </p>
        )}
        <p>{info.summary}</p>
        <ul>
          {info.facts.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        {near.length > 0 && (
          <p>
            <strong>Monuments :</strong> {near.map((m) => m.name).join(', ')}
          </p>
        )}
        <p className="people__sources">
          <a href={info.wikipedia} target="_blank" rel="noopener noreferrer">
            Wikipédia ↗
          </a>
        </p>
      </div>
      <h3>Voir sur la carte</h3>
      {steps.length === 0 ? (
        <p className="gallery__none">Aucune étape de l'Atlas ne passe près de cette ville pour l'instant.</p>
      ) : (
        <ul className="gallery__appears">
          {steps.map((s) => (
            <li key={`${s.empireId}/${s.stepId}`}>
              <button
                type="button"
                onClick={() => {
                  requestFocusPoint(city.coords);
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

/** Galerie des villes (data/city-info.json) : filtrables par continent, recherche sur les noms, fiche et étapes proches. */
export function CitiesView({ query, onNavigate }: { query: string; onNavigate: (empireId: string, stepId: string) => void }) {
  const [continent, setContinent] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const continents = useMemo(() => [...new Set(ALL.map((x) => continentOf(x.city.coords)))].sort(), []);
  const q = norm(query.trim());
  const list = ALL.filter(
    (x) =>
      (continent === 'all' || continentOf(x.city.coords) === continent) &&
      (!q || norm(`${x.city.modern} ${x.city.names.map((n) => n.name).join(' ')}`).includes(q)),
  );
  const sel = selected ? ALL.find((x) => x.city.id === selected) : undefined;
  if (sel) return <CityDetail e={sel} onBack={() => setSelected(null)} onNavigate={onNavigate} />;
  return (
    <section aria-labelledby="cities-title">
      <h2 id="cities-title" className="gallery__section">
        Villes
      </h2>
      <div className="gallery__filters people__empires" role="group" aria-label="Filtrer par continent">
        {['all', ...continents].map((c) => (
          <button key={c} type="button" className="btn btn--ghost" aria-pressed={continent === c} onClick={() => setContinent(c)}>
            {c === 'all' ? 'Toutes' : c}
          </button>
        ))}
      </div>
      <div className="gallery__grid">
        {list.map(({ city }) => (
          <button key={city.id} type="button" className="gallery__card people__card" data-card data-uid={`c:${city.id}`} onClick={() => setSelected(city.id)}>
            <span className="gallery__name">{city.modern}</span>
            {otherName(city) && <span className="people__span">{otherName(city)}</span>}
            <span className="people__span">Fondée en {formatYear(city.founded)}</span>
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="gallery__none">Aucune ville ne correspond.</p>}
    </section>
  );
}
