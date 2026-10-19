import { useMemo, useState, type CSSProperties } from 'react';
import Markdown from 'react-markdown';
import catalogJson from '../../data/empires-catalog.json';
import { EMPIRES } from '../data/loadEmpire';
import { INVENTIONS } from '../data/loadInventions';
import { PEOPLE } from '../data/loadPeople';
import { PROFILES } from '../data/loadProfiles';
import { STATIC_SITE } from '../quiz/api';
import { formatYear } from '../lib/years';
import type { EmpireCatalogEntry } from '../types';
import { duration, summarize } from './summary';
import './empires.css';

const CATALOG = catalogJson as EmpireCatalogEntry[];

interface Props {
  /** Empire présélectionné (?empires=1&e=<id>), sinon l'empire qu'on regardait. */
  initial?: string;
  backName: string;
  onBack: () => void;
  /** Ouvre l'Atlas sur une étape de cet empire. */
  onExplore: (empire: string, step: string) => void;
  onCompare: (empire: string) => void;
}

interface Row {
  id: string;
  name: string;
  start: number;
  end: number;
  region: string;
  color?: string;
  available: boolean;
}

/** Adresse de la page : ?empires=1&e=<id>. */
function writeUrl(id: string | null) {
  const url = new URL(window.location.href);
  url.searchParams.set('empires', '1');
  if (id) url.searchParams.set('e', id);
  else url.searchParams.delete('e');
  if (url.href !== window.location.href) window.history.replaceState(null, '', url);
}

/**
 * « Tous les empires » : une frise de tous les empires du catalogue (disponibles en couleur, à venir grisés),
 * filtrable par continent ; un clic ouvre le résumé de l'empire, construit à partir de ses données.
 */
export function EmpiresView({ initial, backName, onBack, onExplore, onCompare }: Props) {
  const rows = useMemo<Row[]>(() => {
    const byId = new Map(EMPIRES.map((e) => [e.id, e]));
    const list: Row[] = CATALOG.map((c) => {
      const e = byId.get(c.id);
      return { id: c.id, name: e?.name ?? c.name, start: e?.start ?? c.start, end: e?.end ?? c.end, region: c.region, color: e?.color, available: !!e };
    });
    for (const e of EMPIRES)
      if (!list.some((r) => r.id === e.id))
        list.push({ id: e.id, name: e.name, start: e.start, end: e.end, region: 'Autres', color: e.color, available: true });
    return list.sort((a, b) => a.start - b.start);
  }, []);
  const regions = useMemo(() => [...new Set(rows.map((r) => r.region))], [rows]);
  const [region, setRegion] = useState<string | null>(null);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selected, setSelected] = useState<string | null>(() => (rows.some((r) => r.id === initial) ? initial! : null));
  const shown = rows.filter((r) => (!region || r.region === region) && (!onlyAvailable || r.available));

  const min = Math.min(...rows.map((r) => r.start));
  const max = Math.max(...rows.map((r) => r.end));
  const x = (y: number) => ((y - min) / (max - min)) * 100;
  const ticks = useMemo(() => {
    const out: number[] = [];
    const step = max - min > 2500 ? 1000 : 500; // libellés « 3000 av. J.-C. » : assez d'espace entre deux
    for (let y = Math.ceil(min / step) * step; y <= max; y += step) out.push(y === 0 ? 1 : y);
    return out;
  }, [min, max]);

  const select = (id: string) => {
    setSelected(id);
    writeUrl(id);
  };

  return (
    <div className="empires-view">
      <header className="empires-view__head">
        <button type="button" className="btn" onClick={onBack}>
          ← Retour à {backName}
        </button>
        <h1>Tous les empires</h1>
        <p className="empires-view__intro">
          {rows.filter((r) => r.available).length} empires à explorer sur la carte, {rows.filter((r) => !r.available).length} à venir. Cliquez sur un empire
          pour son résumé.
        </p>
        <div className="empires-view__filters" role="group" aria-label="Filtrer par continent">
          <button type="button" className="btn" aria-pressed={region === null} onClick={() => setRegion(null)}>
            Tous
          </button>
          {regions.map((r) => (
            <button key={r} type="button" className="btn" aria-pressed={region === r} onClick={() => setRegion(r)}>
              {r}
            </button>
          ))}
          <label className="empires-view__only">
            <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} /> Disponibles seulement
          </label>
        </div>
      </header>

      <div className="empires-view__body">
        <section className="empires-chart" aria-label="Frise de tous les empires">
          <div className="empires-chart__axis" aria-hidden="true">
            {ticks.map((y) => (
              <span key={y} style={{ left: `${x(y)}%` }}>
                {formatYear(y)}
              </span>
            ))}
          </div>
          <ul className="empires-chart__rows">
            {shown.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className={`empires-chart__bar${r.available ? '' : ' empires-chart__bar--soon'}`}
                  style={{ left: `${x(r.start)}%`, width: `${Math.max(0.6, x(r.end) - x(r.start))}%`, '--c': r.color ?? '#a99a7c' } as CSSProperties}
                  aria-pressed={selected === r.id}
                  aria-label={`${r.name}, ${formatYear(r.start)} – ${formatYear(r.end)}${r.available ? '' : ', bientôt disponible'}`}
                  onClick={() => select(r.id)}
                >
                  <span className="empires-chart__name">{r.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {selected && (
          <Summary
            key={selected}
            row={rows.find((r) => r.id === selected)!}
            onClose={() => (setSelected(null), writeUrl(null))}
            onExplore={onExplore}
            onCompare={onCompare}
          />
        )}
      </div>
    </div>
  );
}

function Summary({ row, onClose, onExplore, onCompare }: { row: Row; onClose: () => void; onExplore: Props['onExplore']; onCompare: Props['onCompare'] }) {
  const empire = EMPIRES.find((e) => e.id === row.id);
  const s = useMemo(() => (empire ? summarize(empire, PROFILES[empire.id], PEOPLE[empire.id], INVENTIONS[empire.id]) : null), [empire]);
  const [sage, setSage] = useState<{ state: 'idle' | 'loading' | 'done' | 'error'; text?: string }>({ state: 'idle' });

  const askSage = async () => {
    setSage({ state: 'loading' });
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Fais-moi un résumé vivant de l'empire « ${row.name} » (${formatYear(row.start)} – ${formatYear(row.end)}) en 150 à 200 mots : origine, apogée, grands tournants, chute et héritage. Appuie-toi sur les étapes de l'Atlas, sans déplacer la carte.`,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { reponse: string };
      setSage({ state: 'done', text: data.reponse });
    } catch {
      setSage({ state: 'error' });
    }
  };

  return (
    <aside className="empire-summary" aria-label={`Résumé : ${row.name}`} style={{ '--c': row.color ?? '#a99a7c' } as CSSProperties}>
      <button type="button" className="empire-summary__close" aria-label="Fermer le résumé" onClick={onClose}>
        ✕
      </button>
      <p className="empire-summary__region">{row.region}</p>
      <h2>{row.name}</h2>
      {!empire || !s ? (
        <>
          <p className="empire-summary__span">
            {formatYear(row.start)} – {formatYear(row.end)} · {duration(row.start, row.end)} ans
          </p>
          <p className="empire-summary__soon">Bientôt disponible : cet empire n'a pas encore sa carte animée ni son récit dans l'Atlas.</p>
        </>
      ) : (
        <>
          <p className="empire-summary__span">{s.span}</p>
          <p className="empire-summary__desc">{empire.description}</p>
          <dl className="empire-summary__facts">
            {s.apogee && (
              <div>
                <dt>Apogée</dt>
                <dd>
                  {formatYear(s.apogee.step.year)}
                  {s.apogee.area ? ` · ${s.apogee.area}` : ''}
                </dd>
              </div>
            )}
            {s.population && (
              <div>
                <dt>Population maximale</dt>
                <dd>{s.population}</dd>
              </div>
            )}
            <div>
              <dt>Étapes · batailles</dt>
              <dd>
                {empire.steps.length} · {s.battles}
              </dd>
            </div>
          </dl>

          {s.periods.length > 0 && (
            <section>
              <h3>Grandes périodes</h3>
              <ol className="empire-summary__periods">
                {s.periods.map((p) => (
                  <li key={p.name} style={{ '--pc': p.color } as CSSProperties}>
                    <strong>{p.name}</strong> <span>{p.span}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section>
            <h3>Moments clés</h3>
            <ol className="empire-summary__moments">
              {s.moments.map((m) => (
                <li key={m.step.id}>
                  <button type="button" onClick={() => onExplore(empire.id, m.step.id)}>
                    <span className="empire-summary__why">{m.why}</span> {formatYear(m.step.year)} · {m.step.title}
                  </button>
                </li>
              ))}
            </ol>
          </section>

          {s.people.length > 0 && (
            <section>
              <h3>Personnages</h3>
              <p className="empire-summary__list">{s.people.map((p) => p.name).join(' · ')}</p>
            </section>
          )}
          {s.inventions.length > 0 && (
            <section>
              <h3>Inventions</h3>
              <p className="empire-summary__list">{s.inventions.map((i) => `${i.name} (${formatYear(i.year)})`).join(' · ')}</p>
            </section>
          )}
          {s.legacy && (
            <section>
              <h3>Héritage</h3>
              <p>{s.legacy}</p>
            </section>
          )}

          {!STATIC_SITE && (
            <section className="empire-summary__sage">
              {sage.state === 'done' ? (
                <>
                  <h3>Le résumé du sage</h3>
                  <Markdown>{sage.text ?? ''}</Markdown>
                </>
              ) : (
                <button type="button" className="btn" onClick={askSage} disabled={sage.state === 'loading'}>
                  {sage.state === 'loading' ? 'Le sage rédige…' : '🧙 Résumé par le sage'}
                </button>
              )}
              {sage.state === 'error' && <p role="alert">Le sage ne répond pas : lancez le serveur de l'agent (npm run agent) avec votre clé.</p>}
            </section>
          )}

          <div className="empire-summary__actions">
            <button type="button" className="btn btn--primary" onClick={() => onExplore(empire.id, empire.steps[0]!.id)}>
              Explorer sur la carte →
            </button>
            {s.apogee && (
              <button type="button" className="btn" onClick={() => onExplore(empire.id, s.apogee!.step.id)}>
                ♛ Voir l'apogée
              </button>
            )}
            <button type="button" className="btn" onClick={() => onCompare(empire.id)}>
              ⇄ Comparer
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
